import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types.ts'
import { applyUnfold, buildFaceTree, disposeFaceTree, facePoints, facingYaw, farFirstOrder, layOnFloor, placeLines, stepUnfold, surfaceRoutes, uniqueRoutes } from './faceTree.ts'
import { buildBook, DESK_COLOR, VIEW_DIR } from './bookScene.ts'
import type { GridPolyhedron } from './gridNet.ts'
import { foldOrderOf, matchingEdges, netCheck, oppositeFaces, polyhedronOf, type Vec3 } from './polyhedra.ts'
import { buildLesson, LESSON_POSE, type LessonObject } from './lessons/index.ts'
import { PAPER, type Look } from './theme.ts'

// 처음 카메라가 보는 점에서 카메라 쪽 방향 (비스듬히 위, 오른쪽 앞). 정다면체는 이 방향에서 먼 면부터 접는다
const MOVING = 1e-6 // 이 값보다 0·1 에서 떨어져 있어야 "접히는 중" (단계 경계의 부동소수 오차 무시)
// 맞닿는 모서리 쌍 색: 빨강, 주황, 노랑, 초록, 청록, 파랑, 보라 (ui.md 색 기준). 쌍이 더 많으면 돌려 쓴다.
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
  edgeDivisions = 2,
  onSceneChange,
  onDrawState,
  onRouteChoices,
  onFacePick,
  faceMarking = false,
  onFaceMark,
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // 도형을 새로 만들 때 지금 값으로 시작하려고
  const viewRef = useRef({ unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions, faceMarking, lesson })
  const applyRef = useRef<(() => void) | null>(null)
  const sceneRef = useRef(scene) // 선을 더할 때 지금 scene 을 쓰려고
  const callbacksRef = useRef({ onSceneChange, onDrawState, onRouteChoices, onFacePick, onFaceMark, onPageMenu })
  const drawSceneLinesRef = useRef<((lines: ShapeScene['lines']) => void) | null>(null)
  const drawMarksRef = useRef<((scene: ShapeScene) => void) | null>(null)

  // unfold·foldMode·보기 옵션·강조·선 긋기 모드·설명만 바뀌면 다시 만들지 않고 회전·강조·표시만 바꾼다. 아래 도형 만들기 effect 보다 먼저 돈다
  useEffect(() => {
    viewRef.current = { unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions, faceMarking, lesson }
    applyRef.current?.()
  }, [unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions, faceMarking, lesson])
  useEffect(() => {
    callbacksRef.current = { onSceneChange, onDrawState, onRouteChoices, onFacePick, onFaceMark, onPageMenu }
  }, [onSceneChange, onDrawState, onRouteChoices, onFacePick, onFaceMark, onPageMenu])

  // lines 만 바뀌면 선분만 다시 그린다. 선을 그을 때마다 카메라가 처음 구도로 돌아가지 않게 (viewer.md ViewerProps)
  useEffect(() => {
    sceneRef.current = scene
    drawSceneLinesRef.current?.(scene.lines)
    drawMarksRef.current?.(scene)
  }, [scene])
  // lines 와 면 표시(글자·색칠)를 뺀 도형과 책 페이지(글·사진). 이것이 바뀔 때만 다시 만든다 (선·면 표시는 카메라 각도를 지키며 그것만 다시 그린다)
  const net = scene.net.layout === 'grid' ? { ...scene.net, faces: scene.net.faces.map(({ x, y, w, h }) => ({ x, y, w, h })) } : scene.net
  const shapeKey = JSON.stringify({ ...scene, lines: undefined, net, pageNumbers, photo })
  const pageRef = useRef({ pageText, pageResult, pageMenu, pageNumbers, photo })
  const rebuildBookRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    pageRef.current = { pageText, pageResult, pageMenu, pageNumbers, photo } // 아래 다시 만들기 effect 보다 먼저 돈다
  }, [pageText, pageResult, pageMenu, pageNumbers, photo])
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

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.localClippingEnabled = true // 학습지 사진을 책 페이지 안으로 자른다
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true // 기본 PCF. 가장자리는 light.shadow.radius 로 흐리게
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
    const throughMaterial = new THREE.MeshBasicMaterial({ color: '#9b7bff', transparent: true, opacity: 0.35, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
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
    const center = bounds.getCenter(new THREE.Vector3())
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius
    // 설명 모드는 입체만 보므로 바닥에 눕힌 자세 대신 입체를 바로 세우고(밑면이 바닥, 원래 좌표 그대로) 그 범위에 맞춰 카메라를 당긴다 (viewer.md "설명 모드")
    const standUp = () => {
      tree.root.quaternion.identity()
      tree.root.position.set(0, -Math.min(...poly.positions.map((p) => p[1])), 0)
    }
    applyUnfold(tree, 0)
    standUp()
    tree.root.updateMatrixWorld(true)
    const solidBounds = new THREE.Box3().expandByObject(tree.root)
    const solidCenter = solidBounds.getCenter(new THREE.Vector3())
    const solidRadius = solidBounds.getBoundingSphere(new THREE.Sphere()).radius
    layOnFloor(tree, poly, yaw)
    // 카메라가 담는 범위: 보통은 접고 펼치는 전체(가운데는 아래 카메라에서 책등 쪽으로 옮긴다), 설명 모드는 바로 세운 입체
    const floorFit = { center: center.clone(), radius }
    const solidFit = { center: solidCenter, radius: solidRadius * 1.6 } // 아래 바가 설명 조작으로 높아져도 입체가 가리지 않게 넉넉히
    const netFit = { center: new THREE.Vector3(), radius } // 전개도 설명('net')은 바닥에 펼친 전개도 범위. 아래에서 flatNet 으로 채운다
    let fit = floorFit
    applyUnfold(tree, 1)
    const flatNet = new THREE.Box3().setFromObject(tree.root) // 다 펼친 전개도 범위(+ 사진). 책 페이지 크기를 정한다

    // 학습지 사진 (viewer.md "책 장면"): 전개도 grid 좌표 (x, y) = tree.root 안의 (x, −y, 0). 루트의 자식이라 접혀도 바닥에 남는다.
    // 사진은 정사각형 안에 비율대로 들어간다 (전개도 그리기 칸의 SVG image 와 같게). 페이지는 그 정사각형까지 담게 늘린다
    const pic = grid ? pageRef.current.photo : undefined
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
    const barMaterial = new THREE.MeshBasicMaterial({ color: '#3c4048' })
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
    const lineMaterial = new THREE.MeshBasicMaterial({ color: '#e64980' })
    const hiddenLineMaterial = pullTowardCamera(
      new THREE.LineDashedMaterial({ color: '#f08fb0', dashSize: radius * 0.03, gapSize: radius * 0.03, depthFunc: THREE.GreaterDepth, depthWrite: false }),
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
    const divisionMaterial = new THREE.MeshBasicMaterial({ color: '#3d6fd9' })
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
        color: '#9aa0a8',
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
      const material = pullTowardCamera(new THREE.SpriteMaterial({ map: labelTexture(text), color: '#3c4048', depthWrite: false }), labelPull)
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
          const material = new THREE.MeshBasicMaterial({ map: labelTexture(text), color: '#3c4048', transparent: true, depthWrite: false })
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
    let refit: (() => void) | null = null // 카메라 범위를 다시 맞춘다 (아래 resize). 카메라를 만든 뒤에 채워진다
    let lessonObject: LessonObject | null = null
    let lessonKey: string | null = null // 종류(+ 닮음비). 바뀌면 설명 물체를 새로 만든다
    let lessonFit: { center: THREE.Vector3; radius: number } | null = null // 설명이 bounds 를 주면 그 범위
    // 입체로 보는 설명은 책을 그 범위에 맞춰 다시 만든다 (전개도 크기의 책에서는 도형이 작아 보이고, 닮음의 큰 도형은 책 밖으로 나간다). null 이면 전개도 범위
    let bookRange: THREE.Box3 | null = null
    let lowered = false
    let aim: ((dir: THREE.Vector3) => void) | null = null // 카메라를 만든 뒤에 채워진다
    let rebuildBook: (() => void) | null = null // 책을 만든 뒤에 채워진다
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
        lessonFit = null
        if (lessonObject?.bounds) {
          tree.root.updateMatrixWorld(true)
          const box = lessonObject.bounds.clone().applyMatrix4(tree.root.matrixWorld)
          lessonFit = { center: box.getCenter(new THREE.Vector3()), radius: box.getBoundingSphere(new THREE.Sphere()).radius * 1.6 } // solidFit 과 같이 아래 바에 가리지 않게 넉넉히
          bookRange = box
        } else bookRange = lesson && LESSON_POSE[lesson.kind] === 'solid' ? solidBounds : null
        rebuildBook?.()
        // 높이가 중요한 설명은 카메라를 낮추고, 끝나면 돌아온다 (lessons/index.ts view)
        if (lessonObject?.view || lowered) aim?.(lessonObject?.view ?? VIEW_DIR)
        lowered = !!lessonObject?.view
      }
      lessonObject?.setCut?.(lesson?.cut ?? 0.5)
      lessonObject?.apply(lesson?.progress ?? 0)
      return { on: lessonObject !== null, ghost: lessonObject !== null && LESSON_POSE[lesson!.kind] === 'solid' }
    }

    let active: number | null = null
    const apply = () => {
      const { unfold, foldMode, showHiddenEdges, showMatchingEdges, showVertexLabels, highlightVertices, drawLines, edgeDivisions } = viewRef.current
      const { on: lessonOn, ghost } = applyLesson()
      // 입체 설명은 입체 범위로, 전개도 설명은 펼친 전개도 범위로 카메라를 당긴다. 설명 중에는 설명과 상관없는 표시(꼭짓점·모서리 색·점선)를 잠시 숨긴다
      const nextFit = lessonFit ?? (ghost ? solidFit : lessonOn ? netFit : floorFit)
      if (nextFit !== fit) {
        fit = nextFit
        refit?.()
      }
      if (photoMesh) photoMesh.visible = !ghost // 사진은 루트에 붙어 있어서 입체를 세우면 같이 선다
      for (const { n, mesh } of divisionMarkers) mesh.visible = drawLines && n === edgeDivisions
      if (!drawLines) setFirstPick(null)
      if (drawLines) pickedVertex = picked = null // 선 긋기 중에는 꼭짓점·모서리 쌍·면 고르기를 하지 않는다
      if ((drawLines || viewRef.current.faceMarking) && faceSet.size) pickFace(null) // 선 긋기·면 표시 중에는 마주 보는 면 보기를 끈다
      for (const line of [...hiddenEdges, ...hiddenLines]) line.visible = showHiddenEdges && !lessonOn
      if (!showMatchingEdges) picked = null
      pairEdges.forEach((pair, k) =>
        pair.forEach((mesh) => {
          mesh.visible = showMatchingEdges && !lessonOn
          mesh.scale.x = mesh.scale.z = k === picked ? 2.5 : 1 // 고른 쌍은 함께 굵게 (색만으로 구분하지 않기)
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
          label.visible = showVertexLabels && !lessonOn
          label.scale.setScalar(radius * (big ? 0.15 : 0.12))
        }
      }
      for (const { sprite } of cornerMaterials) sprite.visible = showVertexLabels
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
    flatNet.getCenter(netFit.center)
    netFit.radius = flatNet.getBoundingSphere(new THREE.Sphere()).radius * 1.1 // 접는 중간 모양까지 담는 평소 범위보다 가깝다
    let book = buildBook(bookRange ?? flatNet, radius, pageRef.current.pageText, [], pageRef.current.pageNumbers, pageRef.current.pageResult, pageRef.current.pageMenu)
    rebuildBook = () => {
      world.remove(book.group)
      book.dispose()
      book = buildBook(bookRange ?? flatNet, radius, pageRef.current.pageText, [], pageRef.current.pageNumbers, pageRef.current.pageResult, pageRef.current.pageMenu)
      world.add(book.group)
    }
    rebuildBookRef.current = rebuildBook
    // 전개도로 보는 설명은 결과가 왼쪽 쪽에 나오므로, 카메라가 왼쪽 쪽 글까지 담는다
    const netRange = flatNet.clone().expandByPoint(book.textCorner)
    netRange.getCenter(netFit.center)
    netFit.radius = netRange.getBoundingSphere(new THREE.Sphere()).radius * 1.1
    photoMesh?.position.setZ(book.top) // 페이지 윗면 높이. layOnFloor 가 루트의 −z 를 아래(−y)로 돌려서 루트 안 z 가 곧 높이다
    world.add(book.group)
    world.fog = new THREE.Fog(DESK_COLOR, radius * 8, radius * 22) // 멀리 있는 책상은 흐리게

    // 밝고 따뜻한 조명: 위아래 은은한 환경광 + 비스듬한 위쪽 빛 하나. 그림자는 도형 둘레만 덮는다
    // (책 전체를 덮으면 같은 그림자 지도로 넓은 곳을 덮어 도형 그림자가 흐릿해진다)
    world.add(new THREE.HemisphereLight('#fffaf0', '#d9cbb3', 1.7))
    const light = new THREE.DirectionalLight('#fff4e2', 1.5)
    light.position.copy(center).add(new THREE.Vector3(-0.4, 1, 0.5).multiplyScalar(radius * 3))
    light.target.position.copy(center)
    light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    light.shadow.radius = 4
    light.shadow.bias = -0.0005
    Object.assign(light.shadow.camera, { left: -radius * 1.5, right: radius * 1.5, top: radius * 1.5, bottom: -radius * 1.5, far: radius * 6 })
    world.add(light, light.target)

    // 비스듬히 위에서 내려다보는 구도 (수평에서 약 40°, 시안 net-folding-ref.png). 거리는 아래 resize 에서 잡는다.
    // 도형 가운데를 보되 책등 쪽으로 조금 옮겨 왼쪽 페이지가 살짝 보이게 한다
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    // 왼쪽 쪽에 메뉴·결과가 있으므로 평소에도 왼쪽 쪽 글까지 담는다
    const floorRange = bounds.clone().expandByPoint(book.textCorner)
    floorRange.getCenter(floorFit.center)
    floorFit.radius = floorRange.getBoundingSphere(new THREE.Sphere()).radius
    const target = floorFit.center.clone()
    camera.position.copy(target).add(VIEW_DIR)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.05 // 바닥 아래로는 돌아가지 않게

    // 화면 비율이 바뀌면(휴대폰 세로 등) 가로·세로 중 좁은 시야에 맞춰 거리를 다시 잡는다. 보는 방향은 유지.
    // 가로로 긴 화면은 아래 바(ui.md 화면 배치)가 3D 위에 떠 있어서, 보는 점을 앞쪽으로 옮겨 도형을 화면 위쪽에 둔다
    // 설명 모드를 켜고 끌 때도 같은 식으로 범위(fit)만 바꿔 다시 맞춘다
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const vfov = THREE.MathUtils.degToRad(camera.fov)
      const fov = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect))
      const dir = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(fit.center).add(new THREE.Vector3(0, 0, camera.aspect > 1.1 ? fit.radius * 0.45 : 0))
      const distance = (fit.radius / Math.sin(fov / 2)) * 1.15
      camera.position.copy(controls.target).addScaledVector(dir, distance)
      // 안개는 카메라 거리에 맞춘다: 멀리 있는 책상만 흐리고 책·도형은 선명하게 (도형 크기에 맞추면 사진이 클 때 다 뿌옜다, #129)
      if (world.fog instanceof THREE.Fog) {
        world.fog.near = distance * 1.6
        world.fog.far = distance * 5
      }
    }
    refit = resize
    aim = (dir) => {
      camera.position.copy(controls.target).add(dir)
      resize()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    // 꼭짓점·모서리 누르기: 끌어서 돌린 것은 클릭이 아니다. 같은 것을 다시 누르거나 빈 곳을 누르면 풀린다.
    // 꼭짓점과 모서리 쌍은 하나만 고른다. 면도 같이 맞혀서, 면에 가려진 뒤쪽 꼭짓점·모서리는 고르지 않는다
    const faceTargets = tree.nodes.map((n) => n.mesh)
    const vertexTargets = markers.map((m) => m.mesh.children[0])
    const pairTargets = pairEdges.flat().map((m) => m.children[0])
    const raycaster = new THREE.Raycaster()
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    const menuHit = () => {
      const page = book.leftPage()
      return page ? book.menuAt(raycaster.intersectObjects([...faceTargets, page], false)[0]) : null
    }
    // 메뉴 줄 위에서는 손가락 커서
    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      renderer.domElement.style.cursor = menuHit() ? 'pointer' : ''
    }
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      // 왼쪽 쪽 메뉴: 도형에 가려지지 않았을 때만 (도형이 앞에 있으면 도형을 누른 것)
      const menuId = menuHit()
      if (menuId) return callbacksRef.current.onPageMenu?.(menuId)
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

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(world, camera)
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
      book.dispose()
      photoMesh?.material.map?.dispose()
      photoMesh?.material.dispose()
      light.shadow.map?.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [shapeKey]) // scene 은 sceneRef 로 읽는다. lines 만 바뀌면 다시 만들지 않는다

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
