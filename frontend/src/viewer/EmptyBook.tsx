import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildBook, DESK_COLOR, type BookContent } from './bookScene.ts'

// 빈 책 (docs/specs/viewer.md "빈 책"): 도형이 없을 때 같은 책 장면을 도형 없이 그린다.
// 왼쪽 쪽은 pageText, 오른쪽 쪽은 차례(contents, 줄 끝에 쪽 번호). 쪽 번호가 있는 줄을 누르면 onPick(번호)
interface Props {
  pageText: string[]
  contents: BookContent[]
  pageNumbers?: [number, number] // 차례 쪽 번호
  onPick: (index: number) => void
}

// 전개도 대신 페이지 크기를 정할 기본 범위 (가로 6 × 세로 6, y = 0)
const NET = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 6))

export function EmptyBook({ pageText, contents, pageNumbers, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  useEffect(() => {
    pickRef.current = onPick
  }, [onPick])
  const key = JSON.stringify({ pageText, contents, pageNumbers })

  useEffect(() => {
    const container = containerRef.current!
    const { pageText, contents, pageNumbers } = JSON.parse(key) as Props
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // 책·빛·카메라는 도형이 있을 때(ThreeViewer)와 같게. 크기는 책 두 쪽이 다 들어오게
    const size = 6
    const world = new THREE.Scene()
    world.background = new THREE.Color(DESK_COLOR)
    const book = buildBook(NET, size, pageText, contents, pageNumbers)
    world.add(book.group)
    world.fog = new THREE.Fog(DESK_COLOR, size * 8, size * 22)
    world.add(new THREE.HemisphereLight('#fffaf0', '#d9cbb3', 1.7))
    const light = new THREE.DirectionalLight('#fff4e2', 1.5)
    light.position.set(-0.4, 1, 0.5).multiplyScalar(size * 3)
    world.add(light)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    const target = book.center.clone()
    camera.position.copy(target).add(new THREE.Vector3(0, 1.88, 1)) // 책등 위에서 앞쪽으로 비스듬히
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.05

    // 가로로 긴 화면은 아래 바가 위에 떠 있어서 보는 점을 앞으로 옮긴다 (ThreeViewer 와 같음)
    const radius = 8.5 // 펼친 책 두 쪽을 담는 반지름
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const vfov = THREE.MathUtils.degToRad(camera.fov)
      const fov = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect))
      const dir = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(target).add(new THREE.Vector3(0, 0, camera.aspect > 1.1 ? radius * 0.2 : 0))
      camera.position.copy(controls.target).addScaledVector(dir, (radius / Math.sin(fov / 2)) * 1.05)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    // 차례 줄 누르기: 끌어서 돌린 것은 클릭이 아니다. 펼칠 수 있는 줄 위에서는 손가락 커서
    const raycaster = new THREE.Raycaster()
    const rowAt = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      const k = book.contentAt(raycaster.intersectObjects(book.pages(), false)[0])
      return k !== null && contents[k].page !== null ? k : null
    }
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const k = rowAt(e)
      if (k !== null) pickRef.current(k)
    }
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = rowAt(e) === null ? '' : 'pointer')
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(world, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointermove', onMove)
      controls.dispose()
      book.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [key])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
