// 아크릴 피라미드 홀로그램 실험 페이지 (제안, 팀 합의 전: docs/proposals/hologram/README.md).
// 도형을 앞·오른쪽·뒤·왼쪽 카메라 4대로 그려 각자의 텍스처에 담고, 화면 가운데 둘레의 사다리꼴 4칸에 붙인다.
// 접기는 서비스 뷰어와 같은 면 트리(viewer/faceTree.ts)를 쓴다. 서비스 코드는 바꾸지 않는다 (lab → src import 만)
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { ShapeScene } from '../src/shared/types.ts'
import { SHAPES, crossScene } from '../src/ui/manualScene.ts'
import { applyUnfold, buildFaceTree, disposeFaceTree, facingYaw, farFirstOrder, layOnFloor, stepUnfold, type FaceTree } from '../src/viewer/faceTree.ts'
import { foldOrderOf, polyhedronOf, type Polyhedron } from '../src/viewer/polyhedra.ts'
import { fitDistance, regions, uvOf, type Region } from './holoLayout.ts'

// ---------- 설정 (localStorage 에 남긴다) ----------
const SHAPE_CHOICES = SHAPES.filter((s) => polyhedronOf(crossScene(s.shape, s.size)) !== null) // 원기둥·원뿔(말기)은 아직 제외
type Settings = {
  shape: string
  center: number // 가운데 정사각형 한 변 / 화면 한 변 (피라미드 꼭지 크기에 맞춘다)
  elevation: number // 카메라 높이각 (도). 0 이면 수평으로 본다
  mirror: boolean // 좌우 반전 (실물에서 글자·모양이 거꾸로 보이면)
  spin: boolean
  fold: boolean
  guide: boolean // 가운데 정사각형 테두리 (피라미드 놓을 자리)
}
const DEFAULTS: Settings = { shape: 'cuboid', center: 0.2, elevation: 20, mirror: false, spin: true, fold: true, guide: true }
const KEY = 'foldy-holo-settings'
const settings: Settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
const save = () => localStorage.setItem(KEY, JSON.stringify(settings))

// ---------- 렌더러 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setClearColor(0x000000, 1)
document.body.appendChild(renderer.domElement)
const pixelRatio = () => Math.min(window.devicePixelRatio, 2) // 휴대폰은 4번 그리므로 2배까지만

// 도형 장면 (네 카메라가 같이 본다)
const world = new THREE.Scene()
world.add(new THREE.AmbientLight(0xffffff, 1))
const spin = new THREE.Group() // 세로축으로 천천히 돈다. 원점 = 다 접은 입체의 가운데 (바닥 높이)
world.add(spin)
const FOV = 35
const cameras = [0, 1, 2, 3].map(() => new THREE.PerspectiveCamera(FOV, 1, 0.01, 1000))

// 4칸 합성 장면 (화면 픽셀 좌표, 가운데 원점, y 위)
const composite = new THREE.Scene()
const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
let targets: THREE.WebGLRenderTarget[] = []
let guide: THREE.LineLoop | null = null

const FACE_COLORS = ['#5ad1ff', '#ffd25a', '#ff7aa8', '#7dff9a', '#b18cff', '#ff9f5a']
const edgeMaterial = new LineMaterial({ color: 0xffffff, linewidth: 3, worldUnits: false })

// ---------- 도형 ----------
type Shape = { tree: FaceTree; poly: Polyhedron; order: number[]; center: THREE.Vector3; rSolid: number; rAll: number; dispose: () => void }
let shape: Shape | null = null

function sceneOf(name: string): ShapeScene {
  const choice = SHAPE_CHOICES.find((s) => s.shape === name) ?? SHAPE_CHOICES[0]
  return crossScene(choice.shape, choice.size)
}

// 흰 1px LineLoop(buildFaceTree 가 붙인 모서리) 대신 굵은 선. 작은 피라미드에서도 보이게
function thickEdges(tree: FaceTree) {
  const lines: Line2[] = []
  for (const n of tree.nodes) {
    for (const child of [...n.mesh.children]) {
      if (!(child instanceof THREE.LineLoop)) continue
      const p = (child.geometry as THREE.BufferGeometry).getAttribute('position')
      const points: number[] = []
      for (let i = 0; i <= p.count; i++) points.push(p.getX(i % p.count), p.getY(i % p.count), p.getZ(i % p.count))
      const line = new Line2(new LineGeometry().setPositions(points), edgeMaterial)
      line.computeLineDistances()
      n.mesh.add(line)
      child.visible = false
      lines.push(line)
    }
  }
  return lines
}

function buildShape(name: string): Shape {
  const poly = polyhedronOf(sceneOf(name))!
  // 면마다 색. 바닥에 펼친 전개도는 위에서 안쪽 면이 보이므로 안쪽도 같은 색 (조금 옅게)
  const look = (i: number, side: THREE.Side, opacity: number) =>
    new THREE.MeshBasicMaterial({ color: FACE_COLORS[i % FACE_COLORS.length], transparent: true, opacity, side, depthWrite: false })
  const faceMaterials = poly.faces.map((_, i) => [look(i, THREE.FrontSide, 0.35), look(i, THREE.BackSide, 0.25)])
  const hiddenLoop = new THREE.LineBasicMaterial({ visible: false })
  const tree = buildFaceTree(poly, [faceMaterials[0][0], faceMaterials[0][1]], hiddenLoop)
  tree.nodes.forEach((n) => (n.mesh.material = faceMaterials[n.face]))
  const lines = thickEdges(tree)

  // 서비스 뷰어와 같은 자세: 전개도를 바닥에 눕히고, 순서가 없는 도형은 앞(+z)에서 먼 면부터 접는다
  const front = new THREE.Vector3(0, 0.6, 1)
  const yaw = poly.foldOrder ? 0 : facingYaw(tree, poly, front)
  layOnFloor(tree, poly, yaw)
  const order = poly.foldOrder ? foldOrderOf(poly) : farFirstOrder(tree, front)

  // 돌리는 축 = 다 접은 입체의 가운데. 접는 동안 차지하는 범위를 미리 재서 카메라 거리를 정한다
  applyUnfold(tree, 0)
  tree.root.updateMatrixWorld(true)
  const solid = new THREE.Box3().expandByObject(tree.root)
  const center = solid.getCenter(new THREE.Vector3())
  tree.root.position.x -= center.x
  tree.root.position.z -= center.z
  center.set(0, center.y, 0)
  const radiusOf = (box: THREE.Box3) => {
    const h = Math.max(Math.hypot(box.min.x, box.min.z), Math.hypot(box.max.x, box.max.z), Math.hypot(box.min.x, box.max.z), Math.hypot(box.max.x, box.min.z))
    return Math.hypot(h, (box.max.y - box.min.y) / 2)
  }
  tree.root.updateMatrixWorld(true)
  const rSolid = radiusOf(new THREE.Box3().expandByObject(tree.root))
  const all = new THREE.Box3()
  const samples = 8 * order.length
  for (let k = 0; k <= samples; k++) {
    applyUnfold(tree, stepUnfold(order, poly.faces.length, 1 - k / samples))
    tree.root.updateMatrixWorld(true)
    all.expandByObject(tree.root)
  }
  const rAll = radiusOf(all)
  spin.add(tree.root)

  return {
    tree,
    poly,
    order,
    center,
    rSolid,
    rAll,
    dispose: () => {
      spin.remove(tree.root)
      lines.forEach((l) => l.geometry.dispose())
      faceMaterials.flat().forEach((m) => m.dispose())
      hiddenLoop.dispose()
      disposeFaceTree(tree)
    },
  }
}

function setShape(name: string) {
  shape?.dispose()
  shape = buildShape(name)
  cycleStart = performance.now()
}

// ---------- 화면 배치 ----------
let L = 0 // 사다리꼴 4칸을 담는 정사각형 한 변 (CSS px)
let c = 0
let regionList: Region[] = []

function layout() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setPixelRatio(pixelRatio())
  renderer.setSize(w, h)
  Object.assign(screenCamera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 })
  screenCamera.updateProjectionMatrix()

  L = Math.min(w, h)
  c = L * settings.center
  regionList = regions(L, c)
  const tw = Math.round(L * pixelRatio())
  const th = Math.max(1, Math.round(((L - c) / 2) * pixelRatio()))

  targets.forEach((t) => t.dispose())
  composite.clear()
  targets = regionList.map((region) => {
    const target = new THREE.WebGLRenderTarget(tw, th, { samples: 4 })
    const geometry = new THREE.BufferGeometry()
    const [a, b, cc, d] = region.corners
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([a, b, cc, a, cc, d].flatMap((p) => [p[0], p[1], 0]), 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([a, b, cc, a, cc, d].flatMap((p) => uvOf(region, L, c, p, settings.mirror)), 2))
    composite.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: target.texture, side: THREE.DoubleSide })))
    return target
  })
  for (const camera of cameras) {
    camera.aspect = tw / th
    camera.updateProjectionMatrix()
  }
  edgeMaterial.resolution.set(tw, th)
  edgeMaterial.linewidth = Math.max(2, (L * pixelRatio()) / 220)

  guide = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(regionList.map((r) => new THREE.Vector3(...r.corners[0], 0))),
    new THREE.LineBasicMaterial({ color: 0x444444 }),
  )
  guide.visible = settings.guide
  composite.add(guide)
}

// ---------- 움직임: 펼친 채 잠깐 → 한 면씩 접기 → 접힌 채 돌기 → 한 번에 펼치기 ----------
const HOLD_OPEN = 1.5
const STEP = 0.9 // 면 하나 접는 시간 (초)
const HOLD_CLOSED = 4
const OPEN = 1.5
let cycleStart = performance.now()
const smooth = (t: number) => t * t * (3 - 2 * t)

function unfoldAt(now: number): { values: number | number[]; s: number } {
  if (!shape || !settings.fold) return { values: 0, s: 0 }
  const folding = STEP * shape.order.length
  const total = HOLD_OPEN + folding + HOLD_CLOSED + OPEN
  const t = ((now - cycleStart) / 1000) % total
  if (t < HOLD_OPEN) return { values: 1, s: 1 }
  if (t < HOLD_OPEN + folding) {
    const s = 1 - (t - HOLD_OPEN) / folding
    return { values: stepUnfold(shape.order, shape.poly.faces.length, s), s }
  }
  if (t < HOLD_OPEN + folding + HOLD_CLOSED) return { values: 0, s: 0 }
  const s = smooth((t - HOLD_OPEN - folding - HOLD_CLOSED) / OPEN)
  return { values: s, s }
}

let zoomR = 1
let open = 0 // 펼친 정도를 부드럽게 따라가는 값 (카메라 거리·높이에 쓴다)
let last = performance.now()
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  if (shape) {
    const { values, s } = unfoldAt(now)
    applyUnfold(shape.tree, values)
    if (settings.spin) spin.rotation.y += dt * 0.35
    // 다 접히면 입체 쪽으로 당겨 크게 보고, 펼칠수록 물러나며 위에서 내려다본다 (바닥에 누운 전개도가 납작하지 않게)
    open += (Math.min(1, s * 1.5) - open) * Math.min(1, dt * 3)
    zoomR = THREE.MathUtils.lerp(shape.rSolid, shape.rAll, open)
    const distance = fitDistance(L, c, zoomR, FOV)
    const el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(settings.elevation, Math.max(settings.elevation, 45), open))
    regionList.forEach((region, k) => {
      const camera = cameras[k]
      const target = shape!.center
      camera.position.set(
        target.x + distance * Math.cos(el) * Math.sin(region.azimuth),
        target.y + distance * Math.sin(el),
        target.z + distance * Math.cos(el) * Math.cos(region.azimuth),
      )
      camera.lookAt(target)
      renderer.setRenderTarget(targets[k])
      renderer.render(world, camera)
    })
  }
  renderer.setRenderTarget(null)
  renderer.render(composite, screenCamera)
  requestAnimationFrame(frame)
}

// ---------- 설정 패널 (화면을 탭하면 열고 닫는다) ----------
const panel = document.getElementById('panel')!
const shapeSelect = document.getElementById('shape') as HTMLSelectElement
for (const s of SHAPE_CHOICES) shapeSelect.add(new Option(s.name, s.shape))
shapeSelect.value = settings.shape

function bindRange(id: keyof Settings, onChange: () => void) {
  const input = document.getElementById(id) as HTMLInputElement
  const out = document.getElementById(`${id}-value`)
  input.value = String(settings[id])
  const show = () => out && (out.textContent = input.value)
  show()
  input.addEventListener('input', () => {
    ;(settings[id] as number) = Number(input.value)
    show()
    save()
    onChange()
  })
}
function bindCheck(id: keyof Settings, onChange: () => void = () => {}) {
  const input = document.getElementById(id) as HTMLInputElement
  input.checked = Boolean(settings[id])
  input.addEventListener('change', () => {
    ;(settings[id] as boolean) = input.checked
    save()
    onChange()
  })
}
shapeSelect.addEventListener('change', () => {
  settings.shape = shapeSelect.value
  save()
  setShape(settings.shape)
})
bindRange('center', layout)
bindRange('elevation', () => {})
bindCheck('mirror', layout)
bindCheck('spin')
bindCheck('fold', () => (cycleStart = performance.now()))
bindCheck('guide', () => guide && (guide.visible = settings.guide))
document.getElementById('reset')!.addEventListener('click', () => {
  localStorage.removeItem(KEY)
  location.reload()
})

let wakeLock: { release: () => Promise<void> } | null = null
document.getElementById('fullscreen')!.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  } catch {
    // iOS Safari 등은 전체 화면을 지원하지 않는다. 홈 화면에 추가해서 쓴다
  }
  try {
    // 화면 꺼짐 방지. HTTPS(또는 localhost)에서만 된다
    wakeLock ??= await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null
  } catch {
    // 지원하지 않으면 그냥 둔다
  }
})

renderer.domElement.addEventListener('click', () => panel.classList.toggle('hidden'))
document.getElementById('close')!.addEventListener('click', () => panel.classList.add('hidden'))

window.addEventListener('resize', layout)
layout()
setShape(settings.shape)
requestAnimationFrame(frame)
