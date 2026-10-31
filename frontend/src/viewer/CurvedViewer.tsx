import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import type { ConePoint, CylinderPoint, Line, RoundSize } from '../shared/types.ts'
import { buildBook, DESK_COLOR } from './bookScene.ts'
import { buildCurvedNet, type CurvedShape } from './curved.ts'
import { textSprite } from './lessons/draw.ts'
import { buildCurvedLesson } from './lessons/curvedLessons.ts'
import type { LessonObject } from './lessons/index.ts'
import { STAIR_LAYERS } from './lessons/volumeLayout.ts'
import { buildSphereBody, buildSphereLesson } from './lessons/sphereLessons.ts'
import { PAPER } from './theme.ts'

const VIEW_DIR = new THREE.Vector3(0.3, 1.96, 1) // 위에서 내려다본다 (수평에서 62°, ThreeViewer 와 같음)

// 곡면 도형(원기둥·원뿔·구) 화면 (docs/specs/viewer.md "곡면 도형"): 같은 책 위에서 옆면을 말고 밑면 원을 접는다. 구는 전개도가 없어 입체만.
// 공식 설명은 말아 둔 도형 대신 바로 세운 입체에 그린다. 곡면 위 선은 scene.lines 그대로 그리고, 화면에서 긋는 입력은 없다
export function CurvedViewer({ scene, unfold = 0, showMatchingEdges = true, showVertexLabels = true, lesson = null, pageText = [], pageResult, pageMenu, onPageMenu, pageNumbers }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef({ unfold, showMatchingEdges, showVertexLabels, lesson })
  const applyRef = useRef<(() => void) | null>(null)
  const pageRef = useRef({ pageText, pageResult, pageMenu, pageNumbers })
  const menuRef = useRef(onPageMenu)
  const rebuildBookRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    viewRef.current = { unfold, showMatchingEdges, showVertexLabels, lesson }
    applyRef.current?.()
  }, [unfold, showMatchingEdges, showVertexLabels, lesson])
  useEffect(() => {
    menuRef.current = onPageMenu
  }, [onPageMenu])
  useEffect(() => {
    pageRef.current = { pageText, pageResult, pageMenu, pageNumbers }
  }, [pageText, pageResult, pageMenu, pageNumbers])
  const pageKey = JSON.stringify({ pageText, pageResult, pageMenu })
  useEffect(() => {
    rebuildBookRef.current?.()
  }, [pageKey])

  const sphere = scene.shape === 'sphere'
  const shape = scene.shape as CurvedShape
  const size: RoundSize = scene.shape === 'sphere' ? { radius: scene.size.radius, height: 2 * scene.size.radius } : (scene.size as RoundSize) // 구는 지름을 높이로 (카메라·책 크기)
  const apexLabel = scene.vertexLabels[0] ?? null
  const key = JSON.stringify({ shape, size, apexLabel, pageNumbers, lines: scene.lines, net: scene.net })

  useEffect(() => {
    const container = containerRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    const world = new THREE.Scene()
    world.background = new THREE.Color(DESK_COLOR)

    // 면 색은 다면체와 같다: 바깥 흰색, 안쪽 아주 연한 하늘색 (ui.md 색 기준)
    const faceStyle = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }
    const faces: [THREE.Material, THREE.Material] = [
      new THREE.MeshStandardMaterial({ ...faceStyle, color: PAPER.looks.normal.outside, side: THREE.FrontSide }), // 3D 디자인 토큰 (theme.ts)
      new THREE.MeshStandardMaterial({ ...faceStyle, color: PAPER.looks.normal.inside, side: THREE.BackSide }),
    ]
    const roughSize = Math.max(2 * Math.PI * size.radius, size.height + 4 * size.radius)
    const net = sphere ? buildSphereBody(size.radius, faces[0]) : buildCurvedNet(shape, size, faces, roughSize * 0.004, scene.lines as Line<CylinderPoint | ConePoint>[], (scene.net as { seam?: number }).seam)
    // 전개도가 책 가운데 오게 옮긴다 (원뿔은 꼭짓점이 원점). 말아도 같은 자리
    const flat = new THREE.Box3().setFromObject(net.group)
    const shift = flat.getCenter(new THREE.Vector3()).setY(0).negate()
    net.group.position.copy(shift)
    world.add(net.group)
    const bounds = new THREE.Box3()
    for (let k = 0; k <= 8; k++) {
      net.apply(k / 8)
      bounds.expandByObject(net.group)
    }
    // InstancedMesh 는 범위 계산이 인스턴스를 다 보지 않아서 면으로 충분한지 평평할 때 범위도 더한다
    bounds.union(flat.clone().translate(shift))
    const flatNet = flat.clone().translate(shift)
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius

    const apexSprite = net.apex && apexLabel && !/[ㄱ-ㆎ가-힣]/.test(apexLabel) ? textSprite(apexLabel, radius * 0.2) : null
    if (apexSprite && net.apex) {
      apexSprite.sprite.position.set(0, radius * 0.08, 0)
      net.apex.add(apexSprite.sprite)
    }

    let bookRange: THREE.Box3 | null = null
    const page = () => pageRef.current
    let book = buildBook(flatNet, radius, page().pageText, [], page().pageNumbers, page().pageResult, page().pageMenu)
    world.add(book.group)
    const rebuildBook = () => {
      world.remove(book.group)
      book.dispose()
      book = buildBook(bookRange ?? flatNet, radius, page().pageText, [], page().pageNumbers, page().pageResult, page().pageMenu)
      world.add(book.group)
    }
    rebuildBookRef.current = rebuildBook

    world.add(new THREE.HemisphereLight('#fffaf0', '#d9cbb3', 1.7))
    const light = new THREE.DirectionalLight('#fff4e2', 1.5)
    light.position.set(-0.4, 1, 0.5).multiplyScalar(radius * 3)
    light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    light.shadow.radius = 4
    light.shadow.bias = -0.0005
    Object.assign(light.shadow.camera, { left: -radius * 1.5, right: radius * 1.5, top: radius * 1.5, bottom: -radius * 1.5, far: radius * 6 })
    world.add(light)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    camera.position.copy(VIEW_DIR)

    // 왼쪽 쪽에 메뉴·결과가 있어서 카메라는 늘 왼쪽 쪽 글까지 담는다
    const resize = () => {
      const range = (bookRange ?? bounds).clone().expandByPoint(book.textCorner)
      const center = range.getCenter(new THREE.Vector3())
      const fit = range.getBoundingSphere(new THREE.Sphere()).radius
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const vfov = THREE.MathUtils.degToRad(camera.fov)
      const fov = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect))
      const dir = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(center).add(new THREE.Vector3(0, 0, camera.aspect > 1.1 ? fit * 0.45 : 0))
      const distance = (fit / Math.sin(fov / 2)) * 1.15
      camera.position.copy(controls.target).addScaledVector(dir, distance)
      // 안개는 책 너머 책상만 흐리게: 설명으로 카메라가 멀어져도 책이 뿌옇게 되지 않는다
      world.fog = new THREE.Fog(DESK_COLOR, distance * 2, distance * 6)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    let lessonObject: LessonObject | null = null
    let lessonKey: string | null = null
    let lowered = false
    const apply = () => {
      const { unfold, showMatchingEdges, showVertexLabels, lesson } = viewRef.current
      const nextKey = lesson ? `${lesson.kind}:${lesson.scale ?? 2}:${lesson.pi ?? 'pi'}` : null
      if (nextKey !== lessonKey) {
        lessonObject?.dispose()
        lessonObject = !lesson ? null : sphere ? buildSphereLesson(size.radius, lesson.kind) : buildCurvedLesson(shape, size, lesson.kind, lesson.scale ?? 2, lesson.pi)
        lessonKey = nextKey
        if (lessonObject) world.add(lessonObject.group)
        bookRange = lessonObject?.bounds ?? null // 공식 화면에서는 책을 도형에 맞춘다: 도형이 오른쪽 쪽의 대부분을 차지하게 (ui.md 공식 시각화 규칙)
        // 높이가 중요한 설명은 카메라를 낮추고, 끝나면 돌아온다
        if (lessonObject?.view || lowered) camera.position.copy(controls.target).add(lessonObject?.view ?? VIEW_DIR)
        lowered = !!lessonObject?.view
        rebuildBook()
        resize()
      }
      lessonObject?.setLayers?.(lesson?.layers ?? STAIR_LAYERS[0])
      lessonObject?.setCut?.(lesson?.cut ?? 0.5)
      lessonObject?.apply(lesson?.progress ?? 0)
      net.group.visible = !lessonObject
      net.apply(unfold)
      net.setPaired(showMatchingEdges)
      if (apexSprite) apexSprite.sprite.visible = showVertexLabels
    }
    apply()
    applyRef.current = apply

    // 왼쪽 쪽 메뉴 누르기: 끌어서 돌린 것은 클릭이 아니다. 앞에 도형이 있으면 메뉴를 누른 것이 아니다
    const raycaster = new THREE.Raycaster()
    const menuAt = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      const left = book.leftPage()
      return left ? book.menuAt(raycaster.intersectObjects([...(lessonObject ? [lessonObject.group] : [net.group]), left], true).find((h) => (h.object as THREE.Mesh).isMesh && !(h.object as THREE.InstancedMesh).isInstancedMesh)) : null
    }
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const id = menuAt(e)
      if (id) menuRef.current?.(id)
    }
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = menuAt(e) ? 'pointer' : '')
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
      renderer.setAnimationLoop(null)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointermove', onMove)
      controls.dispose()
      lessonObject?.dispose()
      apexSprite?.dispose()
      net.dispose()
      for (const m of faces) m.dispose()
      book.dispose()
      light.shadow.map?.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- shape·size·라벨은 key 에 들어 있다

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
