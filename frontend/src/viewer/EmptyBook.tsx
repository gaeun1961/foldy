import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { aimLight, bookLights, bookRenderer, buildBook, keepLastFrame, DESK_COLOR, VIEW_DIR, bookView, fitOf, readingRange, type BookContent, type BookMenuItem } from './bookScene.ts'
import { buildOpening, buildPageTurn, LOW_ANGLE, OPENING_SECONDS } from './opening.ts'
import { findTablePencil, startPenSketch } from './penDraw.ts'

// 빈 책 (docs/specs/viewer.md "빈 책"): 도형이 없을 때 같은 책 장면을 도형 없이 그린다.
// 왼쪽 쪽은 pageText, 오른쪽 쪽은 차례(contents, 줄 끝에 쪽 번호). 쪽 번호가 있는 줄을 누르면 차례 쪽이 넘어간 뒤 onPick(번호)
interface Props {
  pageText: string[]
  contents: BookContent[]
  pageNumbers?: [number, number] // 차례 쪽 번호
  onPick: (index: number) => void
  pageOf?: (index: number) => BookSpread // 차례 index번째 도형의 쪽: 고른 도형까지 넘어가는 종이마다 지나가는 도형의 쪽을 찍는다
  opening?: boolean // 처음 한 번 오프닝을 보여 준다 (viewer.md "오프닝"). 도중에 false 가 되면 바로 끝낸다
  onOpened?: () => void // 오프닝이 끝났거나 건너뛰었을 때
  onLastTurn?: () => void // 오프닝의 속표지가 넘어가기 시작할 때 (카메라가 원래 각도로 올라가기 시작한다)
  reading?: string // 읽는 중인 학습지 사진 주소: 오른쪽 쪽에 깔고 펜이 그 위를 계속 칠한다 (viewer.md "빈 책" 읽는 중)
  triggerPick?: { k: number; id: number } // 바깥에서 k번째 줄을 누른 것처럼 페이지 넘기기를 시작한다 (사진 인식 결과 등)
}

export type BookSpread = { text: string[]; pageNumbers?: [number, number]; menu?: BookMenuItem[] }

const MAX_SHEETS = 4 // 차례에서 넘어갈 때 넘기는 종이 수 상한
const VIEW = VIEW_DIR.clone().normalize() // 도형 화면이 보는 방향. 차례 쪽이 넘어가는 동안 이쪽으로 돈다

// 전개도 대신 페이지 크기를 정할 기본 범위 (가로 6 × 세로 6, y = 0)
const NET = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 6))

export function EmptyBook({ pageText, contents, pageNumbers, onPick, pageOf, opening = false, onOpened, onLastTurn, reading, triggerPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  const pageOfRef = useRef(pageOf)
  const openingRef = useRef(opening)
  const openedRef = useRef(onOpened)
  const lastTurnRef = useRef(onLastTurn)
  useEffect(() => {
    pickRef.current = onPick
    pageOfRef.current = pageOf
    openingRef.current = opening
    openedRef.current = onOpened
    lastTurnRef.current = onLastTurn
  }, [onPick, pageOf, opening, onOpened, onLastTurn])
  // triggerPick.id 를 key 에 넣어서 바뀔 때마다 ThreeJS 씬을 새로 열고 바로 페이지 넘기기를 시작한다
  const key = JSON.stringify({ pageText, contents, pageNumbers, reading, triggerPickId: triggerPick?.id })

  useEffect(() => {
    const container = containerRef.current!
    const { pageText, contents, pageNumbers, reading } = JSON.parse(key) as Props & { triggerPickId?: number }
    const renderer = bookRenderer()
    container.appendChild(renderer.domElement)

    // 책·빛·카메라는 도형이 있을 때(ThreeViewer)와 같게. 크기는 책 두 쪽이 다 들어오게
    const size = 6
    const world = new THREE.Scene()
    world.background = new THREE.Color(DESK_COLOR)
    const book = buildBook(NET, size, pageText, contents, pageNumbers)
    world.add(book.group)
    const { ambient, light } = bookLights()
    aimLight(light, book)
    world.add(ambient, light, light.target)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    const target = book.center.clone()
    camera.position.copy(target).add(new THREE.Vector3(0, 1.88, 1)) // 책등 위에서 앞쪽으로 비스듬히
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.05

    // 도형 화면과 같은 구도 (bookView + readingRange): 차례에서 넘어가도 확대 정도·위치가 그대로다
    let distance = 0
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      if (!w || !h) return // 화면에서 떨어질 때(도형 화면으로 바뀔 때) 0 으로 줄이면 마지막 장면을 뜰 수 없다
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const dir = camera.position.clone().sub(controls.target).normalize()
      const view = bookView(fitOf(readingRange(book)), camera)
      controls.target.copy(view.target)
      distance = view.distance
      camera.position.copy(controls.target).addScaledVector(dir, distance)
      world.fog = new THREE.Fog(DESK_COLOR, distance * 2, distance * 6) // 책 너머 책상만 흐리게 (도형 화면과 같게)
      // 크기를 바꾸면 캔버스가 지워지고, ResizeObserver 는 rAF 뒤·화면 표시 전에 불린다. 바로 다시 그려야 줄어드는 동안(휴대폰 오프닝) 빈 캔버스가 안 보인다
      renderer.render(world, camera)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    // 차례 줄 누르기: 끌어서 돌린 것은 클릭이 아니다. 펼칠 수 있는 줄 위에서는 손가락 커서
    const raycaster = new THREE.Raycaster()
    const rowAt = (e: PointerEvent) => {
      if (intro || turn) return null
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      const k = book.contentAt(raycaster.intersectObjects(book.pages(), false)[0])
      return k !== null && contents[k].page !== null ? k : null
    }
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    // 고른 줄: 앞 도형들의 쪽을 한 장씩 넘겨 그 도형에 닿는다(k번째 줄이면 k + 1장). 넘어가는 동안 돌리기를 끄고, 다 넘어가면 onPick
    let turn: { k: number; t: number; show: ReturnType<typeof buildPageTurn>; from: THREE.Vector3 } | null = null
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const k = rowAt(e)
      if (k === null) return
      // 고른 도형 바로 앞 MAX_SHEETS 장만 넘긴다: 장마다 쪽을 그려 올려서 뒤쪽 도형은 휴대폰에서 끊긴다 (#152). 지나가는 쪽은 어차피 읽히지 않는다
      const first = Math.max(0, k + 1 - MAX_SHEETS)
      turn = { k, t: 0, show: buildPageTurn(book, size, Array.from({ length: k + 1 - first }, (_, j) => pageOfRef.current?.(first + j) ?? { text: [] })), from: camera.position.clone().sub(controls.target).normalize() }
      controls.enabled = false
      renderer.domElement.style.cursor = ''
    }
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = rowAt(e) === null ? '' : 'pointer')
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)

    // 오프닝: 같은 장면 위에서 돌고, 끝나면 빈 책 그대로 이어진다. 카메라는 조금 멀리서 다가온다
    const show = openingRef.current ? buildOpening(book, size) : null
    let intro = show
    // 읽는 중: 오른쪽 쪽 여백 안에 사진을 비율대로 깔고, 펜이 사진 위를 계속 칠한다 (사진을 다 읽은 뒤에 시작)
    let sketch: ReturnType<typeof startPenSketch> | null = null
    let photo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null
    let disposed = false
    if (reading) {
      new THREE.TextureLoader().load(reading, (texture) => {
        if (disposed) return texture.dispose()
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        const room = { w: book.page.w * 0.84, d: book.page.d * 0.84 }
        const aspect = texture.image.width / texture.image.height
        const w = Math.min(room.w, room.d * aspect)
        const d = w / aspect
        const cx = book.center.x + book.page.w / 2
        photo = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: texture, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
        photo.rotation.x = -Math.PI / 2
        photo.position.set(cx, book.top, book.center.z)
        world.add(photo)
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
        sketch = startPenSketch({ x: cx - w / 2, z: book.center.z - d / 2, w, d, y: book.top }, book.page.w * 0.28, findTablePencil(book.group)) // 책상 초록 색연필에서 날아와 칠한다
        world.add(sketch.group)
      })
    }

    // triggerPick 이 있으면 씬을 열자마자 해당 줄로 페이지 넘기기를 시작한다 (사진 인식 결과 등)
    if (triggerPick && triggerPick.k >= 0 && triggerPick.k < contents.length && contents[triggerPick.k].page !== null) {
      const k = triggerPick.k
      const first = Math.max(0, k + 1 - MAX_SHEETS)
      turn = { k, t: 0, show: buildPageTurn(book, size, Array.from({ length: k + 1 - first }, (_, j) => pageOfRef.current?.(first + j) ?? { text: [] })), from: camera.position.clone().sub(controls.target).normalize() }
    }

    // 시간은 프레임마다 더한다(한 번에 최대 1/30초). 첫 프레임이 늦거나 멈칫해도 단계를 건너뛰지 않는다
    let t = 0
    let last = -1
    let picked: number | null = null
    let lastTurn = false
    controls.enabled = !intro && !turn
    renderer.setAnimationLoop((now) => {
      const dt = last < 0 ? 0 : Math.min(now - last, 1000 / 30) / 1000
      last = now
      if (turn && turn.t < turn.show.seconds) {
        turn.t += dt
        turn.show.update(turn.t)
        const p = Math.min(1, turn.t / turn.show.seconds)
        const dir = turn.from.clone().lerp(VIEW, p * p * (3 - 2 * p)).normalize()
        camera.position.copy(controls.target).addScaledVector(dir, distance)
        if (turn.t >= turn.show.seconds) picked = turn.k
      }
      if (intro) {
        t += dt
        // 보는 방향: 오프닝 동안 낮게(LOW_ANGLE) 보다가 속표지가 넘어가는 동안 원래 높이각(책등 위 앞쪽, 위 1.88 : 앞 1)으로 올라간다
        const final = Math.atan2(1.88, 1)
        const pitch = intro.low(t) * THREE.MathUtils.degToRad(LOW_ANGLE) + (1 - intro.low(t)) * final
        const dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch))
        if (!openingRef.current || t >= OPENING_SECONDS) {
          dir.set(0, Math.sin(final), Math.cos(final))
          intro.finish()
          intro.dispose() // 오프닝 종이·도형은 다시 안 쓴다. 차례에 머무는 동안 메모리를 잡지 않게
          intro = null
          controls.enabled = true
          camera.position.copy(controls.target).addScaledVector(dir, distance)
          openedRef.current?.()
        } else {
          if (!lastTurn && intro.low(t) < 1) {
            lastTurn = true
            lastTurnRef.current?.()
          }
          intro.update(t)
          camera.position.copy(controls.target).addScaledVector(dir, distance * (1 + 0.3 * (1 - Math.min(1, t / 2.4)) ** 2))
        }
      }
      sketch?.update(now)
      controls.update()
      renderer.render(world, camera)
      // 다 넘어갔다: 이 프레임을 떠서 도형 화면이 첫 프레임을 그릴 때까지 덮어 둔 뒤 onPick
      if (picked !== null) {
        keepLastFrame(renderer.domElement)
        pickRef.current(picked)
        picked = null
      }
    })

    return () => {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointermove', onMove)
      controls.dispose()
      intro?.finish()
      disposed = true
      sketch?.dispose()
      photo?.geometry.dispose()
      photo?.material.map?.dispose()
      photo?.material.dispose()
      turn?.show.dispose()
      book.dispose()
      intro?.dispose()
      light.shadow.map?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      container.removeChild(renderer.domElement)
    }
  }, [key])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
