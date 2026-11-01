import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types.ts'
import { applyUnfold, buildFaceTree, disposeFaceTree, facePoints, facingYaw, farFirstOrder, layOnFloor, placeLines, stepUnfold, surfaceRoutes, uniqueRoutes } from './faceTree.ts'
import { aimLight, bookLights, bookRenderer, bookView, buildBook, liftLastFrame, DESK_COLOR, fitOf, pageTexture, readingRange, VIEW_DIR } from './bookScene.ts'
import { ITEM_LABELS, pageSlots } from './pageSlots.ts'
import { findTablePencil, startPenDraw, type PenDraw } from './penDraw.ts'
import type { GridPolyhedron } from './gridNet.ts'
import { foldOrderOf, matchingEdges, netCheck, oppositeFaces, polyhedronOf, type Vec3 } from './polyhedra.ts'
import { buildLesson, LESSON_POSE, type LessonObject } from './lessons/index.ts'
import { PAPER, type Look } from './theme.ts'

// 처음 카메라가 보는 점에서 카메라 쪽 방향 (비스듬히 위, 오른쪽 앞). 정다면체는 이 방향에서 먼 면부터 접는다
// 펜으로 그려 내기: 마지막으로 다 그린 drawIn 값. 뷰어가 내려갔다 올라와도(홀로그램, 읽는 중 빈 책, 곡면 도형) 같은 값이면 다시 그리지 않게 모듈에 둔다
let lastDrawn: number | undefined
const MOVING = 1e-6 // 이 값보다 0·1 에서 떨어져 있어야 "접히는 중" (단계 경계의 부동소수 오차 무시)
// 맞닿는 모서리 쌍 색: 색연필 빨강, 파랑, 초록, 노랑 + 잉크 (ui.md 컨셉). 쌍이 더 많으면 돌려 쓴다.
// 고른(강조한) 꼭짓점도 이 색을 목록 순서대로 쓴다
const PAIR_COLORS = PAPER.pairs // 3D 디자인 토큰 (theme.ts)

// 선·라벨을 화면 위치는 그대로 두고 깊이만 카메라 쪽으로 pull.value 만큼 당긴다 (시선 방향으로 당기면 화면 위치가 안 바뀐다).
// 보이는 모서리가 면과 깊이를 다투면 그래픽 카드마다 점선·실선이 깜빡여서, polygonOffset 대신 거리로 여유를 준다.
// Sprite 셰이더에는 project_vertex 가 없어서 자리를 잡은 직후(rotatedPosition)에 당긴다
function pullTowardCamera<M extends THREE.Material>(material: M, pull: { value: number }) {
  const PULL = 'mvPosition.xyz *= max(0.0, 1.0 - uPull / length(mvPosition.xyz));'
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPull = pull
    shader.vertexShader =
      'uniform float uPull;\n' +
      shader.vertexShader
        .replace('#include <project_vertex>', `#include <project_vertex>\n${PULL}\ngl_Position = projectionMatrix * mvPosition;`)
        .replace('mvPosition.xy += rotatedPosition;', `mvPosition.xy += rotatedPosition;\n${PULL}`)
  }
  return material
}

// 꼭짓점 라벨 글자 텍스처. 흰 글자로 그려서 SpriteMaterial.color 로 색을 입힌다
function labelTexture(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.font = "bold 96px 'Pretendard Variable', Pretendard, system-ui, sans-serif"
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 70)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// three.js 뷰어: 다면체를 면 트리(polyhedra.ts)로 그려 바닥에 눕히고, unfold 값만큼 펼친다. 마우스로 돌려 볼 수 있다.
// 단계별 접기(foldMode = 'step')는 면을 하나씩 접고 지금 접히는 면을 강조한다 (docs/specs/viewer.md)
// 가려진 모서리는 점선 (showHiddenEdges), 맞닿는 모서리 쌍은 같은 색이고 누르면 쌍이 함께 굵어진다 (showMatchingEdges)
// 꼭짓점은 면마다 표시점·라벨 복사본을 두고, 누르거나 highlightVertices 로 강조하면 복사본이 모두 같은 색이 된다 (showVertexLabels)
// 면 위 선분(scene.lines)은 면 메시의 자식이라 접힘을 따라간다. 선 긋기 모드(drawLines)에서는 두 점을 눌러 선분을 더한다
// 면을 누르면 그 면과 마주 보는 면을 연보라로 칠하고 onFacePick 으로 알린다 (마주 보는 면 보기)
// TODO(3D): 곡면 도형(TODO-17)
export function ThreeViewer({
  scene,
  unfold = 0,
  foldMode = 'all',
  showHiddenEdges = true,
  showMatchingEdges = true,
  showVertexLabels = true,
  highlightVertices = [],
  lesson = null,
  drawLines = false,
  pageText = [],
  pageResult,
  pageMenu,
  onPageMenu,
  pageNumbers,
  photo,
  drawIn,
  penFromTable = true,
  gallery,
  galleryIndex = 0,
  onPickGallery,
  onReady,
  edgeDivisions = 2,
  onSceneChange,
  onDrawState,
  onRouteChoices,
  onFacePick,
  faceMarking = false,
  onFaceMark,
  resetCameraRef,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // 도형을 새로 만들 때 지금 값으로 시작하려고
  const viewRef = useRef({ unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions, faceMarking, lesson })
  const applyRef = useRef<(() => void) | null>(null)
  const sceneRef = useRef(scene) // 선을 더할 때 지금 scene 을 쓰려고
  const callbacksRef = useRef({ onSceneChange, onDrawState, onRouteChoices, onFacePick, onFaceMark, onPageMenu, onPickGallery, onReady })
  const drawSceneLinesRef = useRef<((lines: ShapeScene['lines']) => void) | null>(null)
  const drawMarksRef = useRef<((scene: ShapeScene) => void) | null>(null)
  // 펜으로 그려 내기 (viewer.md "펜으로 그려 내기"): 지금 값과 마지막으로 그린 값. 다르면 도형을 만들 때 그린다
  // fromTable: 펜이 책상 색연필 자리에서 날아오는가 (penFromTable, 바뀌어도 다시 만들지 않는다)
  const drawRef = useRef<{ want?: number; fromTable: boolean }>({ fromTable: penFromTable })
  useEffect(() => {
    drawRef.current.want = drawIn // 아래 도형 만들기 effect 보다 먼저 돈다
    drawRef.current.fromTable = penFromTable
  }, [drawIn, penFromTable])

  // unfold·foldMode·보기 옵션·강조·선 긋기 모드·설명만 바뀌면 다시 만들지 않고 회전·강조·표시만 바꾼다. 아래 도형 만들기 effect 보다 먼저 돈다
  useEffect(() => {
    viewRef.current = { unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions, faceMarking, lesson }
    applyRef.current?.()
  }, [unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions, faceMarking, lesson])
  useEffect(() => {
    callbacksRef.current = { onSceneChange, onDrawState, onRouteChoices, onFacePick, onFaceMark, onPageMenu, onPickGallery, onReady }
  }, [onSceneChange, onDrawState, onRouteChoices, onFacePick, onFaceMark, onPageMenu, onPickGallery, onReady])

  // lines 만 바뀌면 선분만 다시 그린다. 선을 그을 때마다 카메라가 처음 구도로 돌아가지 않게 (viewer.md ViewerProps)
  useEffect(() => {
    sceneRef.current = scene
    drawSceneLinesRef.current?.(scene.lines)
    drawMarksRef.current?.(scene)
  }, [scene])
  // lines 와 면 표시(글자·색칠)를 뺀 도형과 책 페이지(글·사진). 이것이 바뀔 때만 다시 만든다 (선·면 표시는 카메라 각도를 지키며 그것만 다시 그린다)
  const net = scene.net.layout === 'grid' ? { ...scene.net, faces: scene.net.faces.map(({ x, y, w, h }) => ({ x, y, w, h })) } : scene.net
  const galleryKey = gallery && gallery.length > 1 ? gallery.map((g) => ({ ...g, lines: undefined })) : null // 여러 도형: 바뀌면 다시 만든다
  const shapeKey = JSON.stringify({ ...scene, lines: undefined, net, pageNumbers, photo, galleryKey, galleryIndex })
  const pageRef = useRef({ pageText, pageResult, pageMenu, pageNumbers, photo, gallery, galleryIndex })
  const rebuildBookRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    pageRef.current = { pageText, pageResult, pageMenu, pageNumbers, photo, gallery, galleryIndex } // 아래 다시 만들기 effect 보다 먼저 돈다
  }, [pageText, pageResult, pageMenu, pageNumbers, photo, gallery, galleryIndex])
  // 왼쪽 쪽 글·공식 결과만 바뀌면 책 그림만 다시 그린다. 카메라와 설명 진행은 그대로 (viewer.md ViewerProps)
  const pageKey = JSON.stringify({ pageText, pageResult, pageMenu })
  useEffect(() => {
    rebuildBookRef.current?.()
  }, [pageKey])

  useEffect(() => {
    const scene = sceneRef.current
    const poly = polyhedronOf(scene)
    if (!poly) return // 곡면 도형·아직 데이터가 없는 도형
    const container = containerRef.current!

    const renderer = bookRenderer()
    renderer.localClippingEnabled = true // 학습지 사진을 책 페이지 안으로 자른다
    container.appendChild(renderer.domElement)

    const world = new THREE.Scene()
    world.background = new THREE.Color(DESK_COLOR)

    // 면 바깥은 흰색, 안쪽은 아주 연한 하늘색, 모서리는 진한 회색 (docs/specs/ui.md 색 기준)
    const faceStyle = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 } // 모서리 선이 면에 묻혀 깜빡이지 않게
    const pull = { value: 0 } // 모서리 선을 카메라 쪽으로 당기는 거리. 도형 크기를 안 뒤에 정한다 (pullTowardCamera)
    // 단계별 접기에서는 지금 접히는 면을 연한 노랑, 나머지를 배경에 가까운 색으로 (ui.md 색 기준)
    // opacity 가 1 보다 작으면 반투명 (설명 모드에서 안에 쌓이는 조각이 보이게)
    const look = ({ outside, inside, edge, opacity }: Look) => ({
      faces: [
        new THREE.MeshStandardMaterial({ ...faceStyle, color: outside, side: THREE.FrontSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
        new THREE.MeshStandardMaterial({ ...faceStyle, color: inside, side: THREE.BackSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
      ] as [THREE.Material, THREE.Material],
      // 실선은 깊이를 쓰지 않는다. 쓰면 같은 자리의 점선이 실선 깊이와 미세하게 달라 보이는 모서리에서도 깜빡인다
      edge: pullTowardCamera(new THREE.LineBasicMaterial({ color: edge, depthWrite: false }), pull),
    })
    const looks = {
      // 색은 3D 디자인 토큰 (theme.ts PAPER.looks)
      normal: look(PAPER.looks.normal),
      active: look(PAPER.looks.active),
      faded: look(PAPER.looks.faded),
      ghost: look(PAPER.looks.ghost), // 설명 모드: 면을 거의 투명하게
      filled: look(PAPER.looks.filled), // 학습지에서 색칠한 면 (grid fill)
      overlap: look(PAPER.looks.overlap), // 잘못된 전개도에서 겹친 면 (다 접힌 쪽에서만)
      opposite: look(PAPER.looks.opposite), // 누른 면과 마주 보는 면 (마주 보는 면 보기)
    }
    // 학습지 전개도(grid)면 라벨·면 표시·전개도 위 선이 같이 온다 (viewer.md "전개도 grid")
    const grid = 'cornerLabels' in poly ? (poly as GridPolyhedron) : null
    let filledFaces = new Set<number>() // 색칠한 면. 아래 drawMarks 가 채운다
    const overlapFaces = new Set(netCheck(scene)?.overlapFaces ?? [])
    // 마주 보는 면 보기: 누른 면과 마주 보는 면들. 다시 만들면 풀린다
    let faceSet = new Set<number>()
    const faceText = (face: number) => grid?.marks.find((m) => m.face === face)?.text ?? null
    const pickFace = (face: number | null) => {
      const opposite = face === null ? [] : oppositeFaces(poly, face)
      faceSet = new Set(face === null ? [] : [face, ...opposite])
      callbacksRef.current.onFacePick?.(face === null ? null : { face, text: faceText(face), opposite: opposite.map((f) => ({ face: f, text: faceText(f) })) })
    }
    callbacksRef.current.onFacePick?.(null)
    const tree = buildFaceTree(poly, looks.normal.faces, looks.normal.edge)
    // 마주 보는 면 보기: 고른 두 면 위에 반투명 연보라 판. 깊이 검사를 꺼서 다 접어 바닥·뒤쪽에 가려져도 비쳐 보인다
    const throughMaterial = new THREE.MeshBasicMaterial({ color: '#f5c518', transparent: true, opacity: 0.35, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
    const throughPlates = tree.nodes.map((n) => {
      const plate = new THREE.Mesh(n.mesh.geometry, throughMaterial) // 면 메시와 같은 모양 (geometry 는 면 트리가 정리)
      plate.visible = false
      plate.renderOrder = 3
      plate.raycast = () => {} // 누르기에는 걸리지 않게
      n.mesh.add(plate)
      return plate
    })
    // 전개도를 바닥에 눕힌다. 접으면 면이 위로 일어선다 (docs/specs/viewer.md). 순서가 없는 도형은 루트 쪽이 카메라 앞에 오게 돌려 눕힌다
    const yaw = poly.foldOrder ? 0 : facingYaw(tree, poly, VIEW_DIR)
    layOnFloor(tree, poly, yaw)
    world.add(tree.root)
    const order = poly.foldOrder ? foldOrderOf(poly) : farFirstOrder(tree, VIEW_DIR) // 순서가 없는 도형은 카메라에서 먼 면부터

    // 다 접은 모양, 다 펼친 모양, 두 방식의 중간 모양을 모두 담는 범위의 가운데를 보고, 전체가 화면에 들어오는 거리에 둔다.
    // 그래서 펼치고 접는 동안 카메라를 옮기지 않아도 화면 밖으로 나가지 않는다 (단계별 중간 모양은 더 높이 솟을 수 있다)
    // 한 단계를 8 칸으로 나눠 본다 (면이 휘두르며 지나가는 가장 높은 곳까지 담으려고)
    const bounds = new THREE.Box3()
    const samples = 8 * order.length
    for (let k = 0; k <= samples; k++) {
      const s = 1 - k / samples
      for (const values of [s, stepUnfold(order, poly.faces.length, s)]) {
        applyUnfold(tree, values)
        bounds.expandByObject(tree.root)
      }
    }
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius
    // 설명 모드는 입체만 보므로 바닥에 눕힌 자세 대신 입체를 바로 세우고(밑면이 바닥, 원래 좌표 그대로) 책을 그 범위에 맞춘다 (viewer.md "설명 모드")
    const standUp = () => {
      tree.root.quaternion.identity()
      tree.root.position.set(0, -Math.min(...poly.positions.map((p) => p[1])), 0)
    }
    applyUnfold(tree, 0)
    standUp()
    tree.root.updateMatrixWorld(true)
    const solidBounds = new THREE.Box3().expandByObject(tree.root)
    layOnFloor(tree, poly, yaw)
    applyUnfold(tree, 1)
    const flatNet = new THREE.Box3().setFromObject(tree.root) // 다 펼친 전개도 범위(+ 사진). 책 페이지 크기를 정한다
    const netOnly = flatNet.clone() // 지금 도형만 (펜 칸, 여러 도형 배치의 기준)

    // 여러 도형 (viewer.md "여러 도형", worksheets.md): 나머지 도형을 책 오른쪽 쪽에 pageSlots 칸으로 펼친 채 놓는다.
    // 지금 도형은 자리·크기를 그대로 두고(선 긋기·설명·누르기가 이 좌표를 쓴다), 배치 전체를 지금 도형의 칸이 지금 크기가 되게 맞춘다
    const galleryList = pageRef.current.gallery
    const activeIndex = pageRef.current.galleryIndex ?? 0
    const galleryNets: { index: number; tree: ReturnType<typeof buildFaceTree>; holder: THREE.Group; materials: THREE.Material[]; box: THREE.Box3 }[] = []
    const plates: THREE.Mesh[] = []
    let galleryArea: THREE.Box3 | null = null
    if (galleryList && galleryList.length > 1) {
      const { outside, inside, edge } = PAPER.looks.normal
      const metas = galleryList.map((g, i) => {
        if (i === activeIndex) return { box: netOnly }
        const p = polyhedronOf(g)
        if (!p) return null
        // 재질은 전개도마다 따로 (펜 가림이 판마다 다르다)
        const materials = [
          new THREE.MeshStandardMaterial({ ...faceStyle, color: outside, side: THREE.FrontSide }),
          new THREE.MeshStandardMaterial({ ...faceStyle, color: inside, side: THREE.BackSide }),
          new THREE.LineBasicMaterial({ color: edge }),
        ]
        const t = buildFaceTree(p, [materials[0], materials[1]], materials[2] as THREE.LineBasicMaterial)
        layOnFloor(t, p, p.foldOrder ? 0 : facingYaw(t, p, VIEW_DIR))
        applyUnfold(t, 1)
        t.root.updateMatrixWorld(true)
        return { tree: t, materials, box: new THREE.Box3().setFromObject(t.root) }
      })
      const aspectOf = (b: THREE.Box3) => (b.max.x - b.min.x) / Math.max(1e-6, b.max.z - b.min.z)
      const page = { x: 0, y: 0, w: 3, h: 4 } // 세로로 긴 쪽 비율로 칸을 나누고, 아래에서 실제 크기로 늘린다
      const slots = pageSlots(page, metas.map((m) => (m ? aspectOf(m.box) : 1)))
      const a = slots[activeIndex]
      const f = (netOnly.max.z - netOnly.min.z) / a.h // 칸 단위 → 실제 길이 (지금 도형의 칸 = 지금 크기)
      const at = (x: number, y: number) => new THREE.Vector3(netOnly.min.x + (x - a.x) * f, 0, netOnly.min.z + (y - a.y) * f)
      galleryArea = new THREE.Box3(at(page.x, page.y), at(page.x + page.w, page.y + page.h))
      metas.forEach((m, i) => {
        const s = slots[i]
        const corner = at(s.x, s.y)
        // 번호판 ①②…: 칸 왼쪽 위. 지금 접는 도형은 강조색
        const plateSize = Math.min(s.w, s.h) * f * 0.2
        const plate = numberPlate(ITEM_LABELS[i], plateSize, i === activeIndex)
        plate.position.set(corner.x - plateSize * 0.35, 0.002, corner.z - plateSize * 0.35)
        world.add(plate)
        plates.push(plate)
        if (i === activeIndex || !m || !('tree' in m) || !m.tree) return
        const k = (s.h * f) / Math.max(1e-6, m.box.max.z - m.box.min.z)
        const holder = new THREE.Group()
        holder.scale.setScalar(k)
        holder.position.set(corner.x - m.box.min.x * k, 0, corner.z - m.box.min.z * k)
        holder.add(m.tree.root)
        world.add(holder)
        for (const n of m.tree.nodes) n.mesh.userData.gallery = i
        galleryNets.push({ index: i, tree: m.tree, holder, materials: m.materials!, box: new THREE.Box3(corner.clone(), at(s.x + s.w, s.y + s.h)) })
      })
      flatNet.union(galleryArea) // 책은 모든 칸을 담는다
      bounds.union(galleryArea) // 카메라도 (아래 floorRange)
    }

    // 학습지 사진 (viewer.md "책 장면"): 전개도 grid 좌표 (x, y) = tree.root 안의 (x, −y, 0). 루트의 자식이라 접혀도 바닥에 남는다.
    // 사진은 정사각형 안에 비율대로 들어간다 (전개도 그리기 칸의 SVG image 와 같게). 페이지는 그 정사각형까지 담게 늘린다
    const pic = grid && !galleryArea ? pageRef.current.photo : undefined // 여러 도형이면 사진은 지금 도형에만 맞아 다른 칸과 겹쳐서 숨긴다
    const photoMesh = pic ? new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })) : null
    if (pic && photoMesh) {
      photoMesh.position.set(pic.x, -pic.y, 0)
      photoMesh.rotation.set(0, 0, -THREE.MathUtils.degToRad(pic.angle)) // 칸에서 시계 방향 = 위에서 볼 때 시계 방향
      photoMesh.scale.setScalar(pic.size)
      photoMesh.receiveShadow = true
      tree.root.add(photoMesh)
      tree.root.updateMatrixWorld(true)
      // 페이지는 전개도 둘레 여백까지만 (사진 전체를 담으면 사진을 키울수록 책·카메라가 멀어져 도형이 작아진다, #129). 사진은 그 밖을 자른다
      const span = flatNet.getSize(new THREE.Vector3())
      const pad = Math.max(span.x, span.z) * 0.35
      const page = flatNet.clone().expandByVector(new THREE.Vector3(pad, 0, pad))
      const photoRange = flatNet.clone()
      for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) photoRange.expandByPoint(photoMesh.localToWorld(new THREE.Vector3(x, y, 0)))
      flatNet.copy(photoRange.intersect(page))
      photoMesh.material.clippingPlanes = [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), -flatNet.min.x),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), flatNet.max.x),
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -flatNet.min.z),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), flatNet.max.z),
      ]
      new THREE.TextureLoader().load(pic.src, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        const aspect = texture.image.width / texture.image.height
        photoMesh.scale.set(pic.size * Math.min(1, aspect), pic.size * Math.min(1, 1 / aspect), 1)
        photoMesh.material.map = texture
        photoMesh.material.needsUpdate = true
      })
    }

    // 회전축 모서리를 굵게: 붙는 모서리를 따라 가는 원기둥. pivot 에 붙이면 축 위에 있어서 회전해도 그 자리다
    const barMaterial = new THREE.MeshBasicMaterial({ color: '#2f2a25' })
    const bars = new Map<number, THREE.Mesh>()
    for (const n of tree.nodes) {
      if (!n.pivot) continue
      const [a, b] = poly.faces[n.face].hinge!.map((i) => new THREE.Vector3(...poly.positions[i]))
      const length = a.distanceTo(b)
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.012, radius * 0.012, length, 12), barMaterial)
      bar.position.copy(n.axis!).multiplyScalar(length / 2)
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.axis!)
      bar.visible = false
      n.pivot.add(bar)
      bars.set(n.face, bar)
    }

    // 면 위 선분: 면 메시의 자식으로 붙여 접고 펼 때 따라오게 한다. 1px 선은 잘 안 보여서 가는 원기둥으로 (viewer.md "선분")
    // 면에 가려진 부분은 같은 자리의 옅은 분홍 1px 점선으로 비쳐 보인다 (가려진 모서리와 같은 방식, showHiddenEdges 를 따름).
    // 점선은 원기둥 굵기(1%)보다 더 당겨져서(2%) 보이는 선분에는 끼지 않는다
    // lines 가 바뀌면 이 함수로 선분만 다시 그린다
    const lineMaterial = new THREE.MeshBasicMaterial({ color: '#2e9e4f' })
    const hiddenLineMaterial = pullTowardCamera(
      new THREE.LineDashedMaterial({ color: '#8dcba0', dashSize: radius * 0.03, gapSize: radius * 0.03, depthFunc: THREE.GreaterDepth, depthWrite: false }),
      pull,
    )
    let tubes: THREE.Object3D[] = []
    let hiddenLines: THREE.LineSegments[] = []
    const drawSceneLines = (lines: ShapeScene['lines']) => {
      for (const t of tubes) {
        t.removeFromParent()
        ;(t as THREE.Mesh).geometry.dispose()
      }
      tubes = []
      hiddenLines = []
      const all = [...(grid?.netLines ?? []), ...(lines as Line<PolyhedronPoint>[])] // 학습지 전개도 위 선 + 선 긋기로 더한 선
      placeLines(poly, all).forEach((placed, k) => {
        if (!placed) return console.warn(`foldy: 선분 ${k} 의 두 끝점이 같은 면 위에 없어서 그리지 않습니다`, all[k])
        const [from, to] = [new THREE.Vector3(...placed.from), new THREE.Vector3(...placed.to)]
        // 양 끝을 굵기만큼 줄인다. 꼭짓점·모서리에서 끝나는 선이 접은 입체 밖으로 삐져나오지 않게
        const length = Math.max(0, from.distanceTo(to) - 2 * radius * 0.01)
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.01, radius * 0.01, length, 12), lineMaterial)
        tube.position.copy(from).add(to).multiplyScalar(0.5)
        tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
        const dashed = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([from, to]), hiddenLineMaterial).computeLineDistances()
        dashed.renderOrder = 1 // 면을 다 그린 뒤에 (가려진 모서리와 같음)
        dashed.visible = viewRef.current.showHiddenEdges
        tree.nodes[placed.face].mesh.add(tube, dashed)
        tubes.push(tube, dashed)
        hiddenLines.push(dashed)
      })
    }
    drawSceneLines(scene.lines)
    drawSceneLinesRef.current = drawSceneLines

    // 선 긋기 (viewer.md "선 긋기"): 면마다 2·3·4등분점 표시점을 미리 두고, 지금 등분만 보인다.
    // 고른 첫 점은 선분 색의 큰 점(pickMarker)으로 그 면 메시에 붙인다
    const divisionMaterial = new THREE.MeshBasicMaterial({ color: '#2f6fd0' })
    const divisionGeometry = new THREE.SphereGeometry(radius * 0.013, 12, 8)
    const divisionMarkers: { n: number; mesh: THREE.Mesh }[] = []
    for (const node of tree.nodes)
      for (const n of [2, 3, 4])
        for (const { point, at } of facePoints(poly, node.face, n)) {
          if ('vertex' in point) continue
          const mesh = new THREE.Mesh(divisionGeometry, divisionMaterial)
          mesh.position.set(...at)
          mesh.visible = false
          node.mesh.add(mesh)
          divisionMarkers.push({ n, mesh })
        }
    const pickMarker = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.03, 16, 12), lineMaterial)
    pickMarker.visible = false
    let firstPick: { face: number; point: PolyhedronPoint; at: Vec3 } | null = null
    const setFirstPick = (pick: typeof firstPick) => {
      firstPick = pick
      pickMarker.visible = !!pick
      if (pick) {
        tree.nodes[pick.face].mesh.add(pickMarker)
        pickMarker.position.set(...pick.at)
      }
    }

    // 가려진 모서리 점선: 같은 모서리 선을 한 번 더, 면 뒤에 있는 부분(GreaterDepth)만 그린다.
    // 면을 다 그린 뒤에 그려야 깊이가 차 있으므로 renderOrder 를 1 로 (docs/specs/viewer.md "가려진 모서리").
    // 실선·점선 모두 도형 크기의 2% 만큼 카메라 쪽으로 당겨서, 보이는 모서리는 확실히 면 앞, 가려진 모서리는 그대로 면 뒤가 되게 한다
    pull.value = radius * 0.02
    const hiddenMaterial = pullTowardCamera(
      new THREE.LineDashedMaterial({
        color: '#8c8680',
        dashSize: radius * 0.03,
        gapSize: radius * 0.03,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
      }),
      pull,
    )
    // LineLoop 은 닫는 모서리의 점선 간격이 달라져서, 모서리마다 따로 재는 LineSegments 로 그린다
    const hiddenEdges = tree.nodes.map((n) => {
      const points = poly.faces[n.face].vertices.map((i) => new THREE.Vector3(...poly.positions[i]))
      const pairs = points.flatMap((p, k) => [p, points[(k + 1) % points.length]])
      const dashed = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs), hiddenMaterial).computeLineDistances()
      dashed.renderOrder = 1
      n.mesh.add(dashed)
      // 실선도 면을 다 그린 뒤에. 실선은 깊이를 안 써서, 먼저 그리면 나중에 그린 이웃 면에 덮여 끊겨 보인다 (펼친 전개도의 접는 선)
      n.mesh.children[0].renderOrder = 1
      return dashed
    })

    // 맞닿는 모서리: 쌍마다 한 색의 가는 원기둥을 두 면 메시에 하나씩 붙인다. 접힐 때 따라오고, 다 접으면 한 자리에 겹친다.
    // 실선·점선(renderOrder 1)보다 나중에 그려서(renderOrder 2) 그 자리의 실선을 덮는다. 실선은 깊이를 안 써서 덮인다.
    // 면 뒤로 가려지면 원기둥은 안 보이고 점선만 남는다
    // 누르기 쉽게 보이지 않는 굵은 원기둥(hit)을 자식으로 둔다 (Raycaster 는 visible 과 상관없이 맞힌다)
    const pairMaterials = PAIR_COLORS.map((color) => new THREE.MeshBasicMaterial({ color }))
    const edgeGeometry = new THREE.CylinderGeometry(radius * 0.008, radius * 0.008, 1, 8) // 길이 1, 모서리마다 scale.y 로 늘린다
    const hitGeometry = new THREE.CylinderGeometry(radius * 0.04, radius * 0.04, 1, 6)
    const pairEdges = matchingEdges(poly).map((pair, k) =>
      pair.map(([face, edge]) => {
        const [a, b] = edge.map((i) => new THREE.Vector3(...poly.positions[i]))
        const mesh = new THREE.Mesh(edgeGeometry, pairMaterials[k % pairMaterials.length])
        mesh.position.addVectors(a, b).multiplyScalar(0.5)
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
        mesh.scale.y = a.distanceTo(b)
        mesh.renderOrder = 2
        const hit = new THREE.Mesh(hitGeometry)
        hit.visible = false
        hit.userData.pair = k
        mesh.add(hit)
        tree.nodes[face].mesh.add(mesh)
        return mesh
      }),
    )
    let picked: number | null = null // 누른 쌍. 뷰어 안 상태 (viewer.md "맞닿는 모서리")

    // 꼭짓점 복사본: 면마다 자기 꼭짓점의 표시점(구)과 라벨(Sprite)을 꼭짓점 위치에 붙인다. 다 접으면 복사본이 한 자리에 겹친다.
    // 색·흐림은 꼭짓점 인덱스마다 재질 하나라서 복사본 모두에 함께 적용된다 (viewer.md "꼭짓점 복사본").
    // 라벨은 자기 면에 잘리지 않게 라벨 크기만큼 카메라 쪽으로 당긴다. 누르기 쉽게 보이지 않는 큰 구(hit)를 둔다
    const labelPull = { value: radius * 0.1 }
    const vertexCount = poly.positions.length
    const markerMaterials = [...Array(vertexCount)].map(() => new THREE.MeshBasicMaterial({ transparent: true }))
    const labelMaterials = [...Array(vertexCount)].map((_, i) => {
      const text = scene.vertexLabels[i]
      // 한글 기호(ㄱ, ㄴ…)와 기호 없음은 라벨을 그리지 않는다 (ui.md "라벨"). 표시점은 누르기·강조에 쓰므로 남긴다
      return text && !/[\u3131-\u318e\uac00-\ud7a3]/.test(text) ? pullTowardCamera(new THREE.SpriteMaterial({ map: labelTexture(text), depthWrite: false }), labelPull) : null
    })
    const markerGeometry = new THREE.SphereGeometry(radius * 0.018, 16, 12)
    const vertexHitGeometry = new THREE.SphereGeometry(radius * 0.05, 8, 6)
    const markers: { vertex: number; mesh: THREE.Mesh; label: THREE.Sprite | null }[] = []
    for (const n of tree.nodes) {
      for (const i of n.vertices) {
        const position = new THREE.Vector3(...poly.positions[i])
        const mesh = new THREE.Mesh(markerGeometry, markerMaterials[i])
        mesh.position.copy(position)
        const hit = new THREE.Mesh(vertexHitGeometry)
        hit.visible = false
        hit.userData.vertex = i
        mesh.add(hit)
        n.mesh.add(mesh)
        let label: THREE.Sprite | null = null
        if (labelMaterials[i]) {
          label = new THREE.Sprite(labelMaterials[i]!)
          label.position.copy(position)
          label.center.set(-0.1, -0.1) // 꼭짓점의 오른쪽 위에 글자
          label.renderOrder = 3
          n.mesh.add(label)
        }
        markers.push({ vertex: i, mesh, label })
      }
    }
    let pickedVertex: number | null = null // 누른 꼭짓점. 뷰어 안 상태

    // 학습지 전개도 꼭짓점 라벨: 복사본마다 다른 글자라 (면, 꼭짓점)마다 Sprite 하나. 문제 풀이에 필요해서 한글도 보인다 (ui.md "라벨")
    const cornerMaterials = (grid?.cornerLabels ?? []).map(({ face, vertex, text }) => {
      const material = pullTowardCamera(new THREE.SpriteMaterial({ map: labelTexture(text), color: '#2f2a25', depthWrite: false }), labelPull)
      const sprite = new THREE.Sprite(material)
      sprite.position.set(...poly.positions[vertex])
      sprite.center.set(-0.1, -0.1)
      sprite.renderOrder = 3
      sprite.scale.setScalar(radius * 0.12)
      tree.nodes[face].mesh.add(sprite)
      return { material, sprite }
    })
    // 면 표시 (viewer.md "전개도 grid"): 색칠한 면과 면에 쓴 글자. 글자는 면 가운데에 글자 판을 바깥·안쪽에 하나씩
    // (학습지에 인쇄된 쪽은 접으면 안쪽이 되므로 양쪽에서 읽히게). 표시만 바뀌면 3D 를 다시 만들지 않고 이것만 다시 그린다
    let markPlates: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
    const clearMarks = () => {
      for (const plate of markPlates) {
        plate.removeFromParent()
        plate.geometry.dispose()
        plate.material.map?.dispose()
        plate.material.dispose()
      }
      markPlates = []
    }
    const drawMarks = (current: ShapeScene) => {
      clearMarks()
      const rects = current.net.layout === 'grid' ? current.net.faces : []
      const marks = (grid?.netFaces ?? []).map((r, face) => ({ face, text: rects[r]?.text, fill: rects[r]?.fill }))
      filledFaces = new Set(marks.flatMap((m) => (m.fill ? [m.face] : [])))
      for (const { face, text } of marks) {
        if (!text) continue
        const pts = poly.faces[face].vertices.map((v) => new THREE.Vector3(...poly.positions[v]))
        const center = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
        const normal = new THREE.Vector3().crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0])).normalize()
        const up = pts[0].clone().sub(pts[3]).normalize() // 전개도에서 위쪽 (왼쪽 아래 → 왼쪽 위)
        const size = Math.min(pts[0].distanceTo(pts[1]), pts[0].distanceTo(pts[3])) * 0.6
        for (const n of [normal, normal.clone().negate()]) {
          const material = new THREE.MeshBasicMaterial({ map: labelTexture(text), color: '#2f2a25', transparent: true, depthWrite: false })
          const plate = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material)
          plate.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(up.clone().cross(n), up, n))
          plate.position.copy(center).addScaledVector(n, radius * 0.003)
          plate.renderOrder = 1
          tree.nodes[face].mesh.add(plate)
          markPlates.push(plate)
        }
      }
      applyRef.current?.() // 색칠한 면 색
    }
    drawMarks(scene)

    // 펼침 값 적용 + 강조 + 보기 옵션. 단계 사이에 멈춰 있을 때는 마지막에 움직인 면을 계속 강조하고, 끝(0·1)에서는 끈다
    // 설명 모드 (viewer.md "설명 모드"): 종류가 바뀌면 새로 만들어 면 트리 루트(접힌 입체 좌표)에 붙이고, progress 만 바뀌면 apply 만.
    // 자세는 종류마다 다르다 (LESSON_POSE): 'solid' 는 바로 세운 입체에 면을 반투명으로, 'net' 은 바닥에 펼친 전개도 그대로
    let lessonObject: LessonObject | null = null
    let lessonKey: string | null = null // 종류(+ 닮음비). 바뀌면 설명 물체를 새로 만든다
    // 입체로 보는 설명은 책을 그 범위에 맞춰 다시 만든다 (전개도 크기의 책에서는 도형이 작아 보이고, 닮음의 큰 도형은 책 밖으로 나간다). null 이면 전개도 범위
    let bookRange: THREE.Box3 | null = null
    let rebuildBook: (() => void) | null = null // 책을 다시 만들고 빛·카메라를 맞춘다. 카메라를 만든 뒤에 채워진다
    let bookTop = 0 // 페이지 윗면 높이 (책을 만든 뒤에 채워진다)
    const applyLesson = () => {
      const { lesson } = viewRef.current
      const key = lesson ? `${lesson.kind}:${lesson.scale ?? 2}:${lesson.cutKind ?? ''}` : null
      if (key !== lessonKey) {
        lessonObject?.dispose()
        lessonObject = lesson ? buildLesson(scene, poly, tree, lesson.kind, radius, lesson.scale, lesson.cutKind) : null
        lessonKey = key
        if (lessonObject) tree.root.add(lessonObject.group)
        if (lesson && LESSON_POSE[lesson.kind] === 'solid') standUp() // 끄거나 전개도 설명이면 바닥에 눕힌 자세
        else layOnFloor(tree, poly, yaw)
        floorY = null // 자세가 바뀌면 띄우기 기준 높이를 다시 잰다
        if (lessonObject?.bounds) {
          tree.root.updateMatrixWorld(true)
          bookRange = lessonObject.bounds.clone().applyMatrix4(tree.root.matrixWorld)
        } else bookRange = lesson && LESSON_POSE[lesson.kind] === 'solid' ? solidBounds : null
        rebuildBook?.()
      }
      lessonObject?.setCut?.(lesson?.cut ?? 0.5)
      lessonObject?.apply(lesson?.progress ?? 0)
      return { on: lessonObject !== null, ghost: lessonObject !== null && LESSON_POSE[lesson!.kind] === 'solid' }
    }

    let active: number | null = null
    // 학습지 사진 위 전개도 띄우기 (viewer.md "책 장면" 학습지 사진): 펼친 만큼 루트를 들고 사진은 그만큼 내려 페이지에 둔다.
    // 사진과 전개도가 붙어 깊이를 다투며 겹쳐 보이던 것. 다 접으면 0 이라 입체는 페이지에 앉는다
    const LIFT = 0.025
    let floorY: number | null = null
    let penBusy = false // 펜이 그리는 중이면 꼭짓점 라벨(Sprite, 가림 셰이더가 없음)을 숨긴다
    const apply = () => {
      const { unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions } = viewRef.current
      const { on: lessonOn, ghost } = applyLesson()
      // 설명 중에는 설명과 상관없는 표시(꼭짓점·모서리 색·점선)를 잠시 숨긴다
      if (photoMesh) photoMesh.visible = !ghost // 사진은 루트에 붙어 있어서 입체를 세우면 같이 선다
      floorY ??= tree.root.position.y
      const lift = photoMesh && !lessonOn ? radius * LIFT * unfold : 0
      tree.root.position.y = floorY + lift
      if (photoMesh) photoMesh.position.z = bookTop - lift // 루트 안 z 가 곧 높이 (아래 책 만들기 주석)
      for (const { n, mesh } of divisionMarkers) mesh.visible = drawLines && n === edgeDivisions
      if (!drawLines) setFirstPick(null)
      if (drawLines) pickedVertex = picked = null // 선 긋기 중에는 꼭짓점·모서리 쌍·면 고르기를 하지 않는다
      if ((drawLines || viewRef.current.faceMarking) && faceSet.size) pickFace(null) // 선 긋기·면 표시 중에는 마주 보는 면 보기를 끈다
      for (const line of [...hiddenEdges, ...hiddenLines]) line.visible = showHiddenEdges && !lessonOn
      if (!showMatchingEdges) picked = null
      pairEdges.forEach((pair, k) =>
        pair.forEach((mesh) => {
          mesh.visible = showMatchingEdges && !lessonOn
          mesh.scale.x = mesh.scale.z = (k === picked ? 2.5 : 1) * (k >= PAIR_COLORS.length ? 1.7 : 1) // 고른 쌍은 함께 굵게 (색만으로 구분하지 않기)
        }),
      )
      // 강조: props 가 먼저, 없으면 누른 꼭짓점. 강조한 꼭짓점은 목록 순서대로 색, 나머지는 흐리게. 평소에는 모두 진한 회색
      const highlight = highlightVertices.length ? highlightVertices : pickedVertex === null ? [] : [pickedVertex]
      for (let i = 0; i < vertexCount; i++) {
        const j = highlight.indexOf(i)
        const color = j < 0 ? PAPER.looks.normal.edge : PAIR_COLORS[j % PAIR_COLORS.length]
        const opacity = highlight.length && j < 0 ? 0.25 : 1
        for (const m of [markerMaterials[i], labelMaterials[i]]) m?.color.set(color)
        for (const m of [markerMaterials[i], labelMaterials[i]]) if (m) m.opacity = opacity
      }
      for (const { vertex, mesh, label } of markers) {
        const big = highlight.includes(vertex) // 색만으로 구분하지 않게 크게
        mesh.scale.setScalar(big ? 1.8 : 1)
        mesh.visible = !lessonOn
        if (label) {
          label.visible = showVertexLabels && !lessonOn && !penBusy
          label.scale.setScalar(radius * (big ? 0.15 : 0.12))
        }
      }
      for (const { sprite } of cornerMaterials) sprite.visible = showVertexLabels && !penBusy
      if (foldMode === 'step') {
        const values = stepUnfold(order, poly.faces.length, unfold)
        applyUnfold(tree, values)
        const moving = order.find((f) => values[f] > MOVING && values[f] < 1 - MOVING)
        if (moving !== undefined) active = moving
        else if (unfold < MOVING || unfold > 1 - MOVING) active = null
      } else {
        applyUnfold(tree, unfold)
        active = null
      }
      for (const n of tree.nodes) {
        n.mesh.visible = !(lessonOn && lessonObject?.hideSolid)
        // 잘못된 전개도는 다 접힌 쪽(접기 90% 이상)에서 겹친 면을 빨갛게. 색칠한 면은 평소 색 대신 색칠 색
        const base = faceSet.has(n.face) ? looks.opposite : overlapFaces.has(n.face) && unfold <= 0.1 ? looks.overlap : filledFaces.has(n.face) ? looks.filled : looks.normal
        const { faces, edge } = ghost ? looks.ghost : active === null ? base : n.face === active ? looks.active : looks.faded
        n.mesh.material = (lessonOn && lessonObject?.faceMaterials?.(n.face)) || faces // 면을 칠하는 설명(겉넓이)은 자기 재질로
        ;(n.mesh.children[0] as THREE.LineLoop).material = edge
      }
      for (const [face, bar] of bars) bar.visible = face === active
      throughPlates.forEach((plate, f) => (plate.visible = faceSet.has(f)))
    }
    apply()
    applyRef.current = apply
    drawMarksRef.current = drawMarks

    // 책 장면: 바닥(y = 0)이 펼친 책의 오른쪽 페이지다 (viewer.md "책 장면")
    let book = buildBook(bookRange ?? flatNet, radius, pageRef.current.pageText, [], pageRef.current.pageNumbers, pageRef.current.pageResult, pageRef.current.pageMenu)
    bookTop = book.top
    // 페이지 윗면 높이. layOnFloor 가 루트의 −z 를 아래(−y)로 돌려서 루트 안 z 가 곧 높이다. 이미 띄운 만큼은 뺀다 (apply 가 먼저 돌았다)
    photoMesh?.position.setZ(book.top - (tree.root.position.y - (floorY ?? tree.root.position.y)))
    world.add(book.group)
    const { ambient, light } = bookLights()
    aimLight(light, book)
    world.add(ambient, light, light.target)

    // 펜으로 그려 내기: 새 drawIn 값이면 전개도를 가려 두고 펜이 칠해 낸 뒤 왼쪽 쪽 글을 써 낸다 (viewer.md "펜으로 그려 내기")
    let penDraw: PenDraw | null = null
    let blankPage: THREE.Texture | null = null
    const draw = drawRef.current
    if (draw.want !== undefined && draw.want !== lastDrawn && !viewRef.current.lesson && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const want = draw.want // 다 그린 뒤에 그렸다고 적는다. 그리는 중에 다시 만들어지면(사진이 뒤따라 오는 등) 처음부터 다시 그린다
      const materials = new Set<THREE.Material>()
      tree.root.traverse((o) => {
        if (o === photoMesh || o instanceof THREE.Sprite) return
        const m = (o as THREE.Mesh).material
        if (m) for (const x of [m].flat()) materials.add(x)
      })
      for (const l of Object.values(looks)) for (const m of [...l.faces, l.edge]) materials.add(m)
      for (const m of [...pairMaterials, ...markerMaterials, barMaterial, hiddenMaterial, lineMaterial, hiddenLineMaterial, divisionMaterial]) materials.add(m)
      const left = book.leftPage()
      const pageNumber = pageRef.current.pageNumbers?.[0]
      blankPage = left ? pageTexture(book.page.w, book.page.d, 'left', [], [], [], pageNumber) : null
      // 그림자는 가림 셰이더가 안 걸려서 먼저 보인다. 그리는 동안 끄고, 그 전개도를 다 그리면 켠다
      const hideShadow = (root: THREE.Object3D) => {
        const casters: THREE.Object3D[] = []
        root.traverse((o) => {
          if (o.castShadow && o !== photoMesh) casters.push(o)
        })
        for (const o of casters) o.castShadow = false
        return () => casters.forEach((o) => (o.castShadow = true))
      }
      penDraw = startPenDraw({
        // 여러 도형이면 ①부터 칸 순서로 한 번에 (펜 세션 lab/book-pen.ts 와 같은 방식). 지금 도형은 자기 칸
        floors: galleryArea
          ? [{ index: activeIndex, box: netOnly, materials: [...materials], root: tree.root as THREE.Object3D }, ...galleryNets.map((g) => ({ index: g.index, box: g.box, materials: g.materials, root: g.holder as THREE.Object3D }))]
              .sort((x, y) => x.index - y.index)
              .map(({ box, materials: m, root }) => ({ box, y: 0, materials: m, onDrawn: hideShadow(root) }))
          : [{ box: flatNet, y: 0, materials: [...materials], onDrawn: hideShadow(tree.root) }],
        page: left && blankPage ? { material: (left.material as THREE.Material[])[2] as THREE.MeshStandardMaterial, blank: blankPage, x0: book.center.x - book.page.w, z0: book.center.z - book.page.d / 2, w: book.page.w, d: book.page.d, y: book.top } : null,
        size: radius * 0.75,
        home: findTablePencil(book.group), // 책상 위 초록 색연필에서 날아오고 돌아간다 (viewer.md "책상 색연필과 오가기")
        fromHome: draw.fromTable,
        onDone: () => {
          lastDrawn = want
          penBusy = false
          apply()
        },
      })
      penBusy = true
      world.add(penDraw.pen)
      apply()
    }

    // 위에서 내려다보는 구도 (수평에서 62°, VIEW_DIR). 거리는 아래 resize 에서 잡는다
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    const controls = new OrbitControls(camera, renderer.domElement)
    camera.position.copy(VIEW_DIR)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.05 // 바닥 아래로는 돌아가지 않게

    // 카메라는 늘 책(readingRange)만 담는다: 차례·접기·설명 어디서든 책이 화면에서 같은 자리·크기로 보인다 (viewer.md "카메라").
    // 화면 비율이 바뀌거나 설명으로 책을 다시 만들면 다시 맞춘다. 보는 방향은 유지
    let snapTo: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null
    const resize = (smooth = false) => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const dir = camera.position.clone().sub(controls.target).normalize()
      const view = bookView(fitOf(readingRange(book)), camera)
      const newTarget = view.target
      const newPos = newTarget.clone().addScaledVector(dir, view.distance)
      world.fog = new THREE.Fog(DESK_COLOR, view.distance * 2, view.distance * 6) // 책 너머 책상만 흐리게
      controls.minDistance = view.distance * 0.5
      controls.maxDistance = view.distance * 2
      if (smooth) {
        snapTo = { pos: newPos, target: newTarget }
      } else {
        controls.target.copy(newTarget)
        camera.position.copy(newPos)
        snapTo = null
      }
    }
    rebuildBook = () => {
      world.remove(book.group)
      book.dispose()
      book = buildBook(bookRange ?? flatNet, radius, pageRef.current.pageText, [], pageRef.current.pageNumbers, pageRef.current.pageResult, pageRef.current.pageMenu)
      world.add(book.group)
      const left = book.leftPage()
      if (left) penDraw?.retargetPage((left.material as THREE.Material[])[2] as THREE.MeshStandardMaterial) // 펜이 쓰는 중이면 새 쪽에도 가림
      penDraw?.rehome(findTablePencil(book.group)) // 새 책의 책상 색연필
      aimLight(light, book)
      resize(true)
    }
    rebuildBookRef.current = rebuildBook
    if (resetCameraRef) resetCameraRef.current = () => resize(true)
    const observer = new ResizeObserver(() => resize())
    observer.observe(container)
    resize()

    // 꼭짓점·모서리 누르기: 끌어서 돌린 것은 클릭이 아니다. 같은 것을 다시 누르거나 빈 곳을 누르면 풀린다.
    // 꼭짓점과 모서리 쌍은 하나만 고른다. 면도 같이 맞혀서, 면에 가려진 뒤쪽 꼭짓점·모서리는 고르지 않는다
    const faceTargets = tree.nodes.map((n) => n.mesh)
    const vertexTargets = markers.map((m) => m.mesh.children[0])
    const pairTargets = pairEdges.flat().map((m) => m.children[0])
    const raycaster = new THREE.Raycaster()
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => { snapTo = null; down = { x: e.clientX, y: e.clientY } }
    const menuHit = () => book.menuAt(raycaster.intersectObjects([...faceTargets, ...book.menuTargets()], false)[0])
    // 여러 도형: 펼쳐 놓은 다른 도형을 누르면 그것을 고른다
    const galleryTargets = galleryNets.flatMap((g) => g.tree.nodes.map((n) => n.mesh))
    const galleryHit = (): number | null => (galleryTargets.length ? (raycaster.intersectObjects(galleryTargets, false)[0]?.object.userData.gallery ?? null) : null)
    // 메뉴 줄 위에서는 손가락 커서
    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      renderer.domElement.style.cursor = menuHit() || galleryHit() !== null ? 'pointer' : ''
    }
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      // 왼쪽 쪽 메뉴: 도형에 가려지지 않았을 때만 (도형이 앞에 있으면 도형을 누른 것)
      const menuId = menuHit()
      if (menuId) return callbacksRef.current.onPageMenu?.(menuId)
      const galleryPick = galleryHit()
      if (galleryPick !== null) return callbacksRef.current.onPickGallery?.(galleryPick)
      // 설명이 누를 것을 가지고 있으면 먼저 (위치 관계: 기준 모서리 바꾸기)
      const lessonHit = lessonObject?.pickTargets && raycaster.intersectObjects(lessonObject.pickTargets, false)[0]
      if (lessonHit) {
        lessonObject!.pick?.(lessonHit.object)
        return apply()
      }
      if (viewRef.current.drawLines) return pickLinePoint(e.clientX - rect.left, e.clientY - rect.top, rect)
      const targets = [...faceTargets, ...vertexTargets, ...(viewRef.current.showMatchingEdges ? pairTargets : [])]
      const { vertex = null, pair = null, face = null } = raycaster.intersectObjects(targets, false)[0]?.object.userData ?? {}
      pickedVertex = vertex === null || vertex === pickedVertex ? null : vertex
      picked = pair === null || pair === picked ? null : pair
      // 면 가운데(꼭짓점·모서리 쌍이 아닌 곳)를 누르면 마주 보는 면 보기. 같은 면을 다시 누르면 풀린다
      const onFace = vertex === null && pair === null ? face : null
      // 면 표시 모드: 누른 면의 전개도 칸을 알린다 (학습지 전개도 grid 만, UI가 표시를 쓴다)
      if (viewRef.current.faceMarking) {
        if (onFace !== null && grid) callbacksRef.current.onFaceMark?.(grid.netFaces[onFace])
        return apply()
      }
      pickFace(onFace === null || (faceSet.has(onFace) && [...faceSet][0] === onFace) ? null : onFace)
      apply()
    }
    // 선 긋기: 누른 면에서 가장 가까운 고를 수 있는 점 (도형 크기의 6% 안). 두 점이 같은 면 위면 선분 하나,
    // 다른 면이면 겉면 최단 경로를 면별 선분으로 나눠 더한다 (viewer.md "선 긋기")
    // 점 고르기는 화면 픽셀 기준: 누른 곳에서 PICK_PX 안의 가장 가까운 "보이는" 점 (확대해도 같은 크기, 면 바깥을 살짝 눌러도 된다).
    // 다 접으면 꼭짓점 복사본이 한 자리에 겹치므로, 거리가 같으면 누른 곳에 맞은 면의 복사본을 고른다
    const PICK_PX = 28
    const sight = new THREE.Raycaster()
    const isVisible = (world: THREE.Vector3) => {
      const toPoint = world.clone().sub(camera.position)
      sight.set(camera.position, toPoint.clone().normalize())
      const front = sight.intersectObjects(faceTargets, false)[0]
      return !front || front.distance >= toPoint.length() - radius * 0.02 // 점보다 앞에 다른 면이 없음
    }
    const pickLinePoint = (sx: number, sy: number, rect: DOMRect) => {
      const { onSceneChange, onDrawState, onRouteChoices } = callbacksRef.current
      const hitFace: number | undefined = raycaster.intersectObjects(faceTargets, false)[0]?.object.userData.face
      const candidates = tree.nodes.flatMap((node) =>
        facePoints(poly, node.face, viewRef.current.edgeDivisions).flatMap((c) => {
          const world = new THREE.Vector3(...c.at).applyMatrix4(node.mesh.matrixWorld)
          const s = world.clone().project(camera)
          const d = Math.hypot(((s.x + 1) / 2) * rect.width - sx, ((1 - s.y) / 2) * rect.height - sy)
          return d <= PICK_PX && isVisible(world) ? [{ face: node.face, point: c.point, at: c.at, d: Math.round(d) }] : []
        }),
      )
      const near = candidates.sort((a, b) => a.d - b.d || Number(b.face === hitFace) - Number(a.face === hitFace))[0]
      if (!near) {
        if (hitFace !== undefined) return // 면 가운데처럼 점에서 먼 곳은 무시
        setFirstPick(null)
        return onDrawState?.('idle') // 도형 밖을 누르면 풀린다
      }
      const pick = { face: near.face, point: near.point, at: near.at }
      if (!firstPick) {
        setFirstPick(pick)
        return onDrawState?.('picked')
      }
      const first = firstPick
      const same = new THREE.Vector3(...first.at).distanceTo(new THREE.Vector3(...pick.at)) < 1e-9
      setFirstPick(null)
      if (same) return onDrawState?.('idle') // 같은 점을 다시 누르면 풀린다
      // 같은 면이면 선분 하나, 다른 면이면 길 후보 중 가장 짧은 길. 후보 목록은 UI의 "다른 길" 버튼이 쓴다
      const sameFace = !!placeLines(poly, [{ from: first.point, to: pick.point }])[0]
      // 길 후보 전부 (짧은 순). 같은 면 위 두 점이면 그 면 위 직선이 첫째이고, 다른 면들을 지나는 길이 뒤를 잇는다
      // (펼친 전개도에서 여러 면을 가로질러 보이는 선이 접으면 한 면 위 두 점일 때가 있어서)
      const around = surfaceRoutes(poly, first.point, pick.point, Infinity).map((r) => r.lines)
      const routes = uniqueRoutes(poly, sameFace ? [[{ from: first.point, to: pick.point }], ...around] : around) // 모양이 같은 길은 하나만
      const added = routes[0]
      if (!added) return onDrawState?.('no-path')
      const current = sceneRef.current
      onSceneChange?.({ ...current, lines: [...current.lines, ...added] } as ShapeScene)
      onRouteChoices?.(routes)
      onDrawState?.('idle')
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)

    let told = false // 첫 프레임을 그렸다고 알렸는가 (onReady, 다시 만들 때마다 한 번)
    let lastT = performance.now()
    renderer.setAnimationLoop(() => {
      const now = performance.now()
      const dt = Math.min((now - lastT) / 1000, 0.1)
      lastT = now
      if (snapTo) {
        const k = 1 - Math.exp(-8 * dt)
        camera.position.lerp(snapTo.pos, k)
        controls.target.lerp(snapTo.target, k)
        if (camera.position.distanceTo(snapTo.pos) < 0.001) {
          camera.position.copy(snapTo.pos)
          controls.target.copy(snapTo.target)
          snapTo = null
        }
      }
      penDraw?.update(now)
      controls.update()
      renderer.render(world, camera)
      liftLastFrame()
      if (!told) {
        told = true
        callbacksRef.current.onReady?.()
      }
    })

    return () => {
      applyRef.current = null
      rebuildBookRef.current = null
      drawSceneLinesRef.current = null
      drawMarksRef.current = null
      clearMarks()
      renderer.setAnimationLoop(null)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointermove', onMove)
      controls.dispose()
      lessonObject?.dispose()
      disposeFaceTree(tree)
      for (const g of galleryNets) {
        disposeFaceTree(g.tree)
        g.materials.forEach((m) => m.dispose())
      }
      for (const plate of plates) {
        ;(plate.material as THREE.MeshBasicMaterial).map?.dispose()
        ;(plate.material as THREE.Material).dispose()
        plate.geometry.dispose()
      }
      throughMaterial.dispose()
      const lookMaterials = Object.values(looks).flatMap((l) => [...l.faces, l.edge])
      for (const m of [...lookMaterials, ...pairMaterials, ...markerMaterials, barMaterial, hiddenMaterial, lineMaterial, hiddenLineMaterial, divisionMaterial]) m.dispose()
      for (const m of cornerMaterials.map((c) => c.material)) {
        m.map?.dispose()
        m.dispose()
      }
      for (const m of labelMaterials) {
        m?.map?.dispose()
        m?.dispose()
      }
      for (const g of [edgeGeometry, hitGeometry, markerGeometry, vertexHitGeometry, divisionGeometry, pickMarker.geometry]) g.dispose()
      penDraw?.dispose()
      blankPage?.dispose()
      book.dispose()
      photoMesh?.material.map?.dispose()
      photoMesh?.material.dispose()
      light.shadow.map?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      container.removeChild(renderer.domElement)
    }
  }, [shapeKey]) // scene 은 sceneRef 로 읽는다. lines 만 바뀌면 다시 만들지 않는다

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

// 여러 도형의 번호판 ①②… (바닥에 눕힌 둥근 판). 종이색 + 잉크 테두리, 지금 접는 도형은 지금 접히는 면과 같은 연한 노랑 (ui.md 컨셉, viewer.md "여러 도형")
function numberPlate(text: string, size: number, active: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = active ? '#f8df8e' : '#faf6ee'
  ctx.beginPath()
  ctx.arc(64, 64, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = active ? 8 : 5
  ctx.strokeStyle = '#2f2a25'
  ctx.stroke()
  ctx.font = 'bold 84px sans-serif'
  ctx.fillStyle = '#2f2a25'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 70)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }))
  plate.rotation.x = -Math.PI / 2
  plate.renderOrder = 2
  return plate
}

