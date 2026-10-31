// 책 위에 펜으로 그려 내기 시연 (lab, 서비스 빌드에 안 들어감). 학습지에 전개도가 여러 개(①~⑥)일 때 두 가지 놓기를 비교한다.
// - 책 안에 맞추기: 오른쪽 쪽 안에 pageSlots 로 늘어놓는다 (worksheets.md "여러 도형 배치" 제안 그대로)
// - 띄워서 크게: 책 위 공중에 카메라 쪽으로 기울인 판을 띄워 더 넓은 곳에 늘어놓는다 (책 밖으로 나가도 잘 보이는 것이 먼저)
// 펜은 viewer/penDraw.ts 그대로: 전개도를 하나씩 칠한 뒤 왼쪽 쪽 문제 글을 써 낸다
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { gridScene } from '../src/ui/manualScene.ts'
import { buildBook, DESK_COLOR, pageTexture, VIEW_DIR } from '../src/viewer/bookScene.ts'
import { applyUnfold, buildFaceTree, layOnFloor } from '../src/viewer/faceTree.ts'
import { netVariant } from '../src/viewer/gridNet.ts'
import { pageSlots } from '../src/viewer/pageSlots.ts'
import { startPenDraw, type PenDraw, type PenFloor } from '../src/viewer/penDraw.ts'
import { polyhedronOf } from '../src/viewer/polyhedra.ts'
import { PAPER } from '../src/viewer/theme.ts'

type Mode = 'page' | 'float'
const PICKS = [0, 3, 5, 7, 9, 10] // 정육면체 전개도 11가지 중 보기로 쓸 것 (모양이 다르게)
const CONTENT = { w: 3, d: 4 } // 오른쪽 쪽 안쪽 (책은 여기에 여백을 두른다)

const stage = document.getElementById('stage')!
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
stage.appendChild(renderer.domElement)
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.48

let world = new THREE.Scene()
let pen: PenDraw | null = null
const state = { count: 4, mode: 'float' as Mode, slow: false }

// 숫자 ①~⑥ 판 (바닥에 눕는 글자). 펜이 전개도와 함께 칠해 낸다
function numberPlate(text: string, size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.font = "bold 104px 'Pretendard Variable', Pretendard, system-ui, sans-serif"
  ctx.fillStyle = '#c4473a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 70)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }))
  plate.rotation.x = -Math.PI / 2
  return plate
}

// 정육면체 전개도 하나: 펼친 채 바닥에 눕힌 면 트리. 재질은 전개도마다 따로 (펜 가림이 전개도마다 다르다)
function cubeNet(k: number) {
  const poly = polyhedronOf(gridScene(netVariant(k, [1, 1, 1])))!
  const { outside, inside, edge } = PAPER.looks.normal
  const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }
  const faces: [THREE.Material, THREE.Material] = [
    new THREE.MeshStandardMaterial({ ...offset, color: outside, side: THREE.FrontSide }),
    new THREE.MeshStandardMaterial({ ...offset, color: inside, side: THREE.BackSide }),
  ]
  const tree = buildFaceTree(poly, faces, new THREE.LineBasicMaterial({ color: edge }))
  layOnFloor(tree, poly)
  applyUnfold(tree, 1)
  tree.root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(tree.root)
  return { root: tree.root, box }
}

function build() {
  pen?.dispose()
  world.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose()
      for (const m of [o.material].flat()) m.dispose()
    }
  })
  world = new THREE.Scene()
  world.background = new THREE.Color(DESK_COLOR)

  const { count, mode } = state
  const content = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(CONTENT.w, 0, CONTENT.d))
  const size = Math.hypot(CONTENT.w, CONTENT.d) / 2
  const text = ['정육면체의 전개도', `다음 중 정육면체의 전개도를 모두 찾아 보세요. (보기 ${count}개)`]
  const book = buildBook(content, size, text, [], [6, 7])
  world.add(book.group)

  // 놓을 곳: 책 안이면 오른쪽 쪽 안쪽, 띄우면 책 위 공중의 판 (더 넓고 카메라 쪽으로 기울임)
  const frame = new THREE.Group()
  // 띄운 판은 오른쪽 쪽에서 책 밖 오른쪽까지 (왼쪽 쪽 글은 가리지 않는다). 쪽보다 가로 2.8배, 세로 1.3배 (전개도가 쪽 안보다 2배쯤 크게)
  const float = { w: CONTENT.w * 2.8, h: CONTENT.d * 1.3 }
  const area = mode === 'page' ? { x: 0, y: 0, w: CONTENT.w, h: CONTENT.d } : { x: -float.w / 2, y: -float.h / 2, w: float.w, h: float.h }
  if (mode === 'float') {
    frame.position.set(float.w / 2, size * 0.55, CONTENT.d / 2)
    frame.rotation.x = 0.55 // 먼 쪽을 들어 카메라를 보게
  }
  world.add(frame)
  frame.updateMatrixWorld(true)

  const nets = PICKS.slice(0, count).map(cubeNet)
  const slots = pageSlots(area, nets.map((n) => (n.box.max.x - n.box.min.x) / (n.box.max.z - n.box.min.z)))
  const floors: PenFloor[] = nets.map((net, i) => {
    const slot = slots[i]
    const k = slot.w / (net.box.max.x - net.box.min.x)
    const holder = new THREE.Group()
    holder.scale.setScalar(k)
    holder.position.set(slot.x - net.box.min.x * k, 0, slot.y - net.box.min.z * k)
    holder.add(net.root)
    const label = numberPlate('①②③④⑤⑥'[i], Math.min(slot.w, slot.h) * 0.22)
    label.position.set(slot.x - Math.min(slot.w, slot.h) * 0.08, 0.001, slot.y + Math.min(slot.w, slot.h) * 0.08)
    frame.add(holder, label)
    const materials = new Set<THREE.Material>()
    for (const o of [holder, label]) o.traverse((x) => (x as THREE.Mesh).material && [(x as THREE.Mesh).material].flat().forEach((m) => materials.add(m)))
    const pad = Math.min(slot.w, slot.h) * 0.15
    const box = new THREE.Box3(new THREE.Vector3(slot.x - pad, 0, slot.y - pad), new THREE.Vector3(slot.x + slot.w + pad * 0.5, 0, slot.y + slot.h + pad * 0.5))
    // 그림자는 가림 셰이더가 안 걸려서, 다 그린 뒤에 켠다 (안 그러면 그림자가 먼저 보인다)
    const shadow = (on: boolean) => holder.traverse((o) => (o.castShadow = on))
    shadow(false)
    return { box, y: 0, frame: mode === 'float' ? frame : undefined, materials: [...materials], onDrawn: () => shadow(true) }
  })

  // 왼쪽 쪽 글을 써 낸다 (빈 쪽 그림 위에 지나간 자리만 글)
  const left = book.leftPage()
  const blank = pageTexture(book.page.w, book.page.d, 'left', [], [], [], 6)
  pen = startPenDraw({
    floors,
    page: left ? { material: (left.material as THREE.Material[])[2] as THREE.MeshStandardMaterial, blank, x0: book.center.x - book.page.w, z0: book.center.z - book.page.d / 2, w: book.page.w, d: book.page.d, y: book.top } : null,
    size: size * 0.5,
    pace: state.slow ? 5 : 1,
    onDone: () => {},
  })
  world.add(pen.pen)

  // 빛: 서비스 책 장면과 같게 (위아래 환경광 + 비스듬한 위쪽 빛, 띄운 판의 그림자가 책에 진다)
  // 책상 평면까지 담으면 너무 멀어서, 펼친 두 쪽 + 띄운 판만
  const pages = new THREE.Box3(new THREE.Vector3(book.center.x - book.page.w, book.top, book.center.z - book.page.d / 2), new THREE.Vector3(book.center.x + book.page.w, book.top, book.center.z + book.page.d / 2))
  const board = new THREE.Box3().setFromObject(frame)
  const all = pages.clone().union(board)
  const center = all.getCenter(new THREE.Vector3())
  const radius = all.getBoundingSphere(new THREE.Sphere()).radius
  world.add(new THREE.HemisphereLight('#fffaf0', '#d9cbb3', 1.7))
  const light = new THREE.DirectionalLight('#fff4e2', 1.5)
  light.position.copy(center).add(new THREE.Vector3(-0.4, 1, 0.5).multiplyScalar(radius * 3))
  light.target.position.copy(center)
  light.castShadow = true
  light.shadow.mapSize.set(2048, 2048)
  light.shadow.radius = 4
  light.shadow.bias = -0.0005
  Object.assign(light.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, far: radius * 6 })
  world.add(light, light.target)
  world.fog = new THREE.Fog(DESK_COLOR, radius * 6, radius * 16)

  // 카메라: 책 안이면 펼친 두 쪽, 띄우면 판과 왼쪽 쪽 글 머리까지 (전개도를 크게)
  const view = mode === 'float' ? board.clone().expandByPoint(book.textCorner) : pages
  const viewCenter = view.getCenter(new THREE.Vector3())
  const viewRadius = view.getBoundingSphere(new THREE.Sphere()).radius
  const tall = Math.min(1, camera.aspect) // 세로 화면이면 가로 시야에 맞춰 더 물러난다
  controls.target.copy(viewCenter)
  camera.position.copy(viewCenter).addScaledVector(VIEW_DIR.clone().normalize(), (viewRadius / Math.sin(THREE.MathUtils.degToRad(22.5)) / tall) * 0.8)
  controls.update()
}

function resize() {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()

// 조작 줄
const button = (label: string, pressed: boolean, onClick: () => void) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'secondary-button'
  b.textContent = label
  b.setAttribute('aria-pressed', String(pressed))
  b.onclick = onClick
  return b
}
function controlsBar() {
  const counts = document.getElementById('counts')!
  const modes = document.getElementById('modes')!
  counts.replaceChildren(...[1, 2, 3, 4, 5, 6].map((n) => button(String(n), n === state.count, () => ((state.count = n), controlsBar(), build()))))
  modes.replaceChildren(
    button('책 안에 맞추기', state.mode === 'page', () => ((state.mode = 'page'), controlsBar(), build())),
    button('띄워서 크게', state.mode === 'float', () => ((state.mode = 'float'), controlsBar(), build())),
  )
  slow.setAttribute('aria-pressed', String(state.slow))
}
document.getElementById('again')!.onclick = build
const slow = document.getElementById('slow')!
slow.onclick = () => ((state.slow = !state.slow), controlsBar(), build())
const query = new URLSearchParams(location.search)
state.count = Math.min(6, Math.max(1, Number(query.get('n')) || state.count))
if (query.get('mode') === 'page') state.mode = 'page'
state.slow = query.has('slow')
controlsBar()
build()

renderer.setAnimationLoop(() => {
  pen?.update(performance.now())
  controls.update()
  renderer.render(world, camera)
})
