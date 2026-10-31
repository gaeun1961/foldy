import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildBook, DESK_COLOR, type BookContent } from './bookScene.ts'
import { buildOpening, OPENING_SECONDS } from './opening.ts'

// 빈 책 (docs/specs/viewer.md "빈 책"): 도형이 없을 때 같은 책 장면을 도형 없이 그린다.
// 왼쪽 쪽은 pageText, 오른쪽 쪽은 차례(contents, 줄 끝에 쪽 번호). 쪽 번호가 있는 줄을 누르면 onPick(번호)
interface Props {
  pageText: string[]
  contents: BookContent[]
  pageNumbers?: [number, number] // 차례 쪽 번호
  onPick: (index: number) => void
  opening?: boolean // 처음 한 번 오프닝을 보여 준다 (viewer.md "오프닝"). 도중에 false 가 되면 바로 끝낸다
  onOpened?: () => void // 오프닝이 끝났거나 건너뛰었을 때
}

// 전개도 대신 페이지 크기를 정할 기본 범위 (가로 6 × 세로 6, y = 0)
const NET = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 6))

export function EmptyBook({ pageText, contents, pageNumbers, onPick, opening = false, onOpened }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  const openingRef = useRef(opening)
  const openedRef = useRef(onOpened)
  useEffect(() => {
    pickRef.current = onPick
    openingRef.current = opening
    openedRef.current = onOpened
  }, [onPick, opening, onOpened])
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
    let distance = 0
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const vfov = THREE.MathUtils.degToRad(camera.fov)
      const fov = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect))
      const dir = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(target).add(new THREE.Vector3(0, 0, camera.aspect > 1.1 ? radius * 0.2 : 0))
      distance = (radius / Math.sin(fov / 2)) * 1.05
      camera.position.copy(controls.target).addScaledVector(dir, distance)
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
      if (intro || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const k = rowAt(e)
      if (k !== null) pickRef.current(k)
    }
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = rowAt(e) === null ? '' : 'pointer')
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)

    // 오프닝: 같은 장면 위에서 돌고, 끝나면 빈 책 그대로 이어진다. 카메라는 조금 멀리서 다가온다
    const show = openingRef.current ? buildOpening(book, size) : null
    let intro = show
    // 시간은 프레임마다 더한다(한 번에 최대 1/30초). 첫 프레임이 늦거나 멈칫해도 단계를 건너뛰지 않는다
    let t = 0
    let last = -1
    controls.enabled = !intro
    renderer.setAnimationLoop((now) => {
      if (intro) {
        if (last >= 0) t += Math.min(now - last, 1000 / 30) / 1000
        last = now
        const dir = camera.position.clone().sub(controls.target).normalize()
        if (!openingRef.current || t >= OPENING_SECONDS) {
          intro.finish()
          intro = null
          controls.enabled = true
          camera.position.copy(controls.target).addScaledVector(dir, distance)
          openedRef.current?.()
        } else {
          intro.update(t)
          camera.position.copy(controls.target).addScaledVector(dir, distance * (1 + 0.3 * (1 - Math.min(1, t / 2.4)) ** 2))
        }
      }
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
      show?.finish()
      book.dispose()
      show?.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [key])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
