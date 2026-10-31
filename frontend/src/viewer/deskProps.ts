// 책상 위 소품 (viewer.md "책 장면", TODO-45): 정다면체 주사위, 컴퍼스, 삼각자 두 개, 아날로그 시계, 필통, 지우개와 가루.
// 이미지 파일 없이 도형과 캔버스 텍스처로만 만든다. 색은 ui.md 컨셉: 중성색 + 연한 색연필 색 (진한 색은 시계 초침의 빨강뿐)
// 시계·컴퍼스·필통은 책 뒤(−z)에, 납작한 물건은 책 옆·앞에 둬서 도형을 가리지 않는다
import * as THREE from 'three'

const INK = '#2f2a25'
const PAPER = '#faf6ee'
const SOFT = '#5c5249' // 차분한 갈색 (ui.md 주요 버튼 색)
const PALE = ['#f3b5aa', '#b5cbec', '#b3dcc0', '#f8df8e', PAPER] // 연한 색연필 색 (빨강·파랑·초록·노랑) + 종이

type Own = <T extends { dispose(): void }>(x: T) => T
// 책과 매트의 자리. 길이는 모두 장면 좌표
export type DeskLayout = {
  spineX: number
  cz: number
  pageD: number
  bookHalfW: number // 책등에서 표지 끝까지
  bookHalfD: number // 책 가운데에서 표지 앞뒤 끝까지
  matHalfW: number
  matHalfD: number
  matTop: number
  deskY: number
  pencilX: number // 색연필이 놓인 곳 (지우개를 그 앞에)
}

// 물체의 가장 낮은 곳이 y 에 닿게 올린다
function rest(obj: THREE.Object3D, y: number) {
  obj.updateMatrixWorld(true)
  obj.position.y += y - new THREE.Box3().setFromObject(obj).min.y
}

// 시계 판: 12시·3시·6시·9시는 둥근 막대, 나머지는 점 (첫 번째 레퍼런스처럼)
function clockFace() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = INK
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    const [s, c] = [Math.sin(a), -Math.cos(a)]
    if (k % 3 === 0) {
      ctx.lineWidth = 13
      ctx.beginPath()
      ctx.moveTo(128 + s * 88, 128 + c * 88)
      ctx.lineTo(128 + s * 108, 128 + c * 108)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(128 + s * 100, 128 + c * 100, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 말랑한 탁상시계. 판은 +z 를 본다. 바늘은 지금 시각을 가리키고 그릴 때마다 움직인다
function buildClock(R: number, own: Own) {
  const clock = new THREE.Group()
  const body = own(new THREE.MeshStandardMaterial({ color: PALE[1], roughness: 0.75 }))
  const hand = own(new THREE.MeshStandardMaterial({ color: SOFT, roughness: 0.6 }))
  const D = R * 0.55
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(own(geometry), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    clock.add(mesh)
    return mesh
  }
  part(new THREE.CylinderGeometry(R, R, D, 48).rotateX(Math.PI / 2), body)
  part(new THREE.TorusGeometry(R * 0.88, R * 0.12, 16, 48), body, 0, 0, D / 2)
  const face = part(new THREE.CircleGeometry(R * 0.8, 48), own(new THREE.MeshStandardMaterial({ map: own(clockFace()), roughness: 0.9 })), 0, 0, D / 2 + R * 0.01)
  // 종 두 개와 꼭지, 손잡이, 다리 두 개
  for (const s of [-1, 1]) {
    const a = (s * 40 * Math.PI) / 180
    const bell = part(new THREE.SphereGeometry(R * 0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), body, Math.sin(a) * R * 0.95, Math.cos(a) * R * 0.95, -D * 0.1)
    bell.rotation.z = -a
    part(new THREE.SphereGeometry(R * 0.09, 12, 8), body, Math.sin(a) * R * 1.33, Math.cos(a) * R * 1.33, -D * 0.1)
    const b = (s * 35 * Math.PI) / 180
    const foot = part(new THREE.CapsuleGeometry(R * 0.11, R * 0.22, 4, 12), body, Math.sin(b) * R * 1.02, -Math.cos(b) * R * 1.02, 0)
    foot.rotation.z = b
  }
  part(new THREE.TorusGeometry(R * 0.5, R * 0.07, 8, 24, Math.PI), body, 0, R * 0.92, -D * 0.25)
  // 바늘: 판 가운데에 축을 두고 +y 로 뻗는다. 시계 방향이라 각도는 −
  const needle = (length: number, width: number, material: THREE.Material, z: number) => {
    const pivot = new THREE.Group()
    const mesh = new THREE.Mesh(own(new THREE.BoxGeometry(width, length, R * 0.03).translate(0, length / 2 - width / 2, 0)), material)
    pivot.add(mesh)
    pivot.position.z = D / 2 + z
    clock.add(pivot)
    return pivot
  }
  const hour = needle(R * 0.42, R * 0.1, hand, R * 0.04)
  const minute = needle(R * 0.62, R * 0.08, hand, R * 0.07)
  const second = needle(R * 0.68, R * 0.025, own(new THREE.MeshStandardMaterial({ color: '#e0442e' })), R * 0.1)
  part(new THREE.CylinderGeometry(R * 0.07, R * 0.07, R * 0.04, 16).rotateX(Math.PI / 2), hand, 0, 0, D / 2 + R * 0.12)
  // 그 프레임에 판이 그려지기 전에 바늘을 맞춘다 (한 프레임 늦게 보여도 시계라 티가 나지 않는다)
  face.onBeforeRender = () => {
    const now = new Date()
    const s = now.getSeconds() + now.getMilliseconds() / 1000
    const m = now.getMinutes() + s / 60
    const turn = (x: number) => -x * Math.PI * 2
    hour.rotation.z = turn(((now.getHours() % 12) + m / 60) / 12)
    minute.rotation.z = turn(m / 60)
    second.rotation.z = turn(Math.floor(s) / 60) // 초침은 똑딱 한 칸씩
  }
  return clock
}

// 컴퍼스: 다리를 조금 벌린 채 책상에 눕혀 둔다. 다리가 있는 평면(xy)을 눕혀 바닥에 붙인다
function buildCompass(L: number, own: Own) {
  const compass = new THREE.Group()
  compass.rotation.x = -Math.PI / 2
  const metal = own(new THREE.MeshStandardMaterial({ color: '#c9c5bd', metalness: 0.3, roughness: 0.35 }))
  const dark = own(new THREE.MeshStandardMaterial({ color: SOFT, roughness: 0.6 }))
  const graphite = own(new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5 }))
  const a = (14 * Math.PI) / 180 // 다리 하나가 가운데에서 벌어진 각
  const r = L * 0.035
  const hinge = new THREE.Vector3(Math.sin(a) * L, Math.cos(a) * L, 0)
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(own(new THREE.CylinderGeometry(r, r * 0.7, L, 10)), metal)
    leg.position.set(hinge.x + s * Math.sin(a) * (L / 2), hinge.y / 2, 0)
    leg.rotation.z = s * a
    leg.castShadow = true
    compass.add(leg)
  }
  // 오른쪽 다리 끝: 연필심을 문 집게와 심
  const holder = new THREE.Mesh(own(new THREE.CylinderGeometry(r * 1.6, r * 1.6, L * 0.14, 10)), dark)
  holder.position.set(2 * hinge.x - Math.sin(a) * L * 0.12, L * 0.12 * Math.cos(a), 0)
  holder.rotation.z = a
  const lead = new THREE.Mesh(own(new THREE.ConeGeometry(r * 0.9, L * 0.06, 8).rotateX(Math.PI)), graphite)
  lead.position.set(2 * hinge.x - Math.sin(a) * L * 0.03, L * 0.03, 0)
  lead.rotation.z = a
  // 위: 경첩과 손잡이
  const head = new THREE.Mesh(own(new THREE.CylinderGeometry(r * 2.4, r * 2.4, r * 3, 16).rotateX(Math.PI / 2)), metal)
  head.position.copy(hinge)
  const grip = new THREE.Mesh(own(new THREE.CylinderGeometry(r * 1.2, r * 1.4, L * 0.18, 12)), dark)
  grip.position.set(hinge.x, hinge.y + L * 0.12, 0)
  for (const m of [holder, lead, head, grip]) {
    m.castShadow = true
    compass.add(m)
  }
  return new THREE.Group().add(compass) // 바깥 묶음이 돌아야 눕힌 채로 방향만 바뀐다
}

// 삼각자: 투명한 아크릴 판 + 가운데 구멍 + 두 변의 눈금. 직각이 원점, 두 변이 +x 와 −z 로
function buildSetSquare(a: number, b: number, t: number, own: Own) {
  const square = new THREE.Group()
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(a, 0), new THREE.Vector2(0, b)])
  const [gx, gy] = [a / 3, b / 3] // 무게중심 쪽으로 줄인 구멍
  const inset = (x: number, y: number) => new THREE.Vector2(gx + (x - gx) * 0.45 + a * 0.03, gy + (y - gy) * 0.45 + b * 0.03)
  shape.holes.push(new THREE.Path([inset(0, 0), inset(0, b), inset(a, 0)]))
  const plate = new THREE.Mesh(
    own(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false }).rotateX(-Math.PI / 2)),
    own(new THREE.MeshStandardMaterial({ color: '#dfeaea', transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false })),
  )
  // 눈금: 두 변을 따라 0.1 마다, 5 칸마다 길게 (a·b 는 장면 길이라 단위 u 를 따로 받지 않고 짧은 변의 비율로)
  const step = Math.min(a, b) / 30
  const points: THREE.Vector3[] = []
  const y = t * 1.02
  for (let k = 1; k * step < a * 0.92; k++) points.push(new THREE.Vector3(k * step, y, 0), new THREE.Vector3(k * step, y, -step * (k % 5 ? 1.2 : 2.4)))
  for (let k = 1; k * step < b * 0.92; k++) points.push(new THREE.Vector3(0, y, -k * step), new THREE.Vector3(step * (k % 5 ? 1.2 : 2.4), y, -k * step))
  const ticks = new THREE.LineSegments(own(new THREE.BufferGeometry().setFromPoints(points)), own(new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.6 })))
  square.add(plate, ticks)
  return square
}

// 필통: 납작한 캡슐에 지퍼. +x 로 길다
function buildPencilCase(length: number, r: number, own: Own) {
  const pencilCase = new THREE.Group()
  const cloth = new THREE.Mesh(own(new THREE.CapsuleGeometry(r, length - 2 * r, 8, 24).rotateZ(Math.PI / 2).scale(1, 0.55, 1)), own(new THREE.MeshStandardMaterial({ color: '#a39a8e', roughness: 0.95 })))
  const zip = own(new THREE.MeshStandardMaterial({ color: SOFT, roughness: 0.5 }))
  const zipper = new THREE.Mesh(own(new THREE.BoxGeometry(length * 0.86, r * 0.06, r * 0.12)), zip)
  zipper.position.y = r * 0.55
  const pull = new THREE.Mesh(own(new THREE.BoxGeometry(r * 0.18, r * 0.05, r * 0.5)), zip)
  pull.position.set(length * 0.3, r * 0.57, r * 0.3)
  pull.rotation.y = 0.3
  for (const m of [cloth, zipper, pull]) {
    m.castShadow = true
    pencilCase.add(m)
  }
  return pencilCase
}

// 지우개: 흰 몸통에 종이 띠. 가루는 둘레에 흩어진 작은 말린 조각 (매번 같은 자리)
function buildEraser(u: number, own: Own) {
  const eraser = new THREE.Group()
  const body = new THREE.Mesh(own(new THREE.BoxGeometry(u * 1.3, u * 0.42, u * 0.62)), own(new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.9 })))
  const sleeve = new THREE.Mesh(own(new THREE.BoxGeometry(u * 0.8, u * 0.44, u * 0.64)), own(new THREE.MeshStandardMaterial({ color: SOFT, roughness: 0.8 })))
  sleeve.position.x = u * 0.22
  body.castShadow = sleeve.castShadow = true
  eraser.add(body, sleeve)
  const crumbGeometry = own(new THREE.CapsuleGeometry(u * 0.035, u * 0.1, 2, 6))
  const crumbMaterial = own(new THREE.MeshStandardMaterial({ color: '#e6e0d4', roughness: 1 }))
  let seed = 11
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < 18; k++) {
    const crumb = new THREE.Mesh(crumbGeometry, crumbMaterial)
    const a = -1.2 - rand() * 2.4 // 지우개의 닳은 쪽(−x) 둘레
    const d = u * (0.8 + rand() * 0.9)
    crumb.position.set(Math.cos(a) * d, -u * 0.21 + u * 0.035, Math.sin(a) * d * 0.9)
    crumb.rotation.set(0, rand() * Math.PI, Math.PI / 2)
    eraser.add(crumb)
  }
  return eraser
}

// 주사위: 면 하나가 바닥에 닿게 눕힌 정다면체 + 잉크 모서리
function buildDie(geometry: THREE.BufferGeometry, color: string, yaw: number, own: Own) {
  own(geometry)
  const n = new THREE.Vector3()
  new THREE.Triangle().setFromAttributeAndIndices(geometry.attributes.position as THREE.BufferAttribute, 0, 1, 2).getNormal(n)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, -1, 0)))
  const die = new THREE.Mesh(geometry, own(new THREE.MeshStandardMaterial({ color, roughness: 0.55, flatShading: true })))
  die.castShadow = true
  die.add(new THREE.LineSegments(own(new THREE.EdgesGeometry(geometry)), own(new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.55 }))))
  die.rotation.y = yaw
  return die
}

export function buildDeskProps(at: DeskLayout, own: Own) {
  const group = new THREE.Group()
  const u = at.pageD / 10 // 소품 크기 단위: 빈 책 쪽 세로가 약 10
  const left = at.spineX - at.bookHalfW
  const right = at.spineX + at.bookHalfW
  const far = at.cz - at.bookHalfD
  const near = at.cz + at.bookHalfD
  const place = (obj: THREE.Object3D, x: number, y: number, z: number, yaw = 0) => {
    obj.rotation.y += yaw
    obj.position.set(x, 0, z)
    rest(obj, y)
    group.add(obj)
    return obj
  }

  // 책 뒤: 시계(왼쪽), 컴퍼스(가운데), 필통(오른쪽)
  const clock = buildClock(u * 1.15, own)
  clock.rotation.x = -0.35 // 위에서 내려다보는 카메라에 판이 잘 보이게 살짝 뒤로 기댄다
  place(clock, left + u * 2.2, at.deskY, far - u * 1.7, 0.25)
  place(buildCompass(u * 2.8, own), at.spineX + u * 0.4, at.deskY, far - u * 1.6, 1.3)
  place(buildPencilCase(u * 4.6, u * 0.75, own), right - u * 2.8, at.deskY, far - u * 1.3, 0.1)

  // 책 왼쪽: 삼각자 두 개가 겹쳐 있다 (45° 와 30°·60°)
  const t = u * 0.05
  place(buildSetSquare(u * 3, u * 3, t, own), left - u * 3.1, at.matTop, at.cz - u * 0.6, 0.25)
  place(buildSetSquare(u * 2.1, u * 3.7, t, own), left - u * 2.6, at.matTop + t * 1.1, at.cz + u * 2.8, -0.15)

  // 색연필 앞: 지우개와 가루
  place(buildEraser(u, own), at.pencilX - u * 0.3, at.matTop, at.cz + u * 4.4, 0.5)

  // 주사위: 책 앞과 귀퉁이에 흩어 둔다
  const r = u * 0.42
  const dice: [THREE.BufferGeometry, number, number, number][] = [
    [new THREE.BoxGeometry(r * 1.3, r * 1.3, r * 1.3), left - u * 1.3, near - u * 0.3, 0.4],
    [new THREE.IcosahedronGeometry(r * 1.05), left - u * 0.3, near + u * 1.2, 0],
    [new THREE.TetrahedronGeometry(r * 1.2), at.spineX - u * 2.4, near + u * 1.5, 0.9],
    [new THREE.OctahedronGeometry(r * 1.05), at.spineX + u * 2.6, near + u * 1.1, 0.3],
    [new THREE.DodecahedronGeometry(r), right + u * 1.4, far + u * 0.6, 0.7],
  ]
  dice.forEach(([geometry, x, z, yaw], k) => {
    const onMat = Math.abs(x - at.spineX) < at.matHalfW && Math.abs(z - at.cz) < at.matHalfD
    place(buildDie(geometry, PALE[k], yaw, own), x, onMat ? at.matTop : at.deskY, z)
  })
  return group
}
