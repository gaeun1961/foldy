// 오프닝 (docs/specs/viewer.md "오프닝"): 처음 들어왔을 때 빈 책 장면 위에서 한 번 돈다. 끝나면 빈 책 그대로 남는다.
// 1 표지가 열리고 종이 여러 장이 넘어온다 → 2 도형들이 페이지에서 떠올라 둥실 → 3 속표지가 넘어가며 도형을 싣고 들어간다 → 4 빈 책
// 이미지 파일 없이 책 장면의 상자·캔버스 텍스처와 three.js 기본 도형으로만 만든다
import * as THREE from 'three'
import { FONT, INK, pageTexture, RED, type buildBook } from './bookScene'

type Book = ReturnType<typeof buildBook>
type Own = <T extends { dispose(): void }>(x: T) => T

// 시간표 (초)
const COVER = [0.3, 1.5] // 표지가 열린다
const FLUTTER = 0.9 // 종이가 넘어오기 시작 (장마다 FLUTTER_GAP 늦게, FLUTTER_TIME 동안)
const FLUTTER_GAP = 0.2
const FLUTTER_TIME = 1.0 // 레퍼런스(KOKUYO Turn the page) 한 장 넘김 약 1초
const FIRST_TIME = 1.8 // 첫 장은 천천히: 왼쪽에 처음 펴지는 종이가 갑자기 생기는 것처럼 보이지 않게. 다음 장들은 그만큼 늦게 출발
const PAGES = 5 // 넘어오는 종이 장 수
const POP = 2.8 // 도형이 하나씩 떠오르기 시작
const ENTER = 5.0 // 도형이 하나씩 곡선을 그리며 책 속(왼쪽 쪽)으로 들어가기 시작 (ENTER_GAP 간격, ENTER_TIME 동안)
const ENTER_GAP = 0.08
const ENTER_TIME = 0.7 // 마지막 도형이 속표지가 왼쪽 쪽을 덮기 전에 내려앉게
const TURN = [6.0, 7.2] // 속표지가 넘어간다. 도형이 들어가는 것과 겹쳐서, 넘어오는 종이가 들어간 도형을 덮어 누른다
export const OPENING_SECONDS = 7.4
const SHAPE_SIZE = 1.8 // 떠 있을 때 도형 크기 (배)
const SLOT_SIZE = 1.25 // 왼쪽 쪽에 들어갔을 때 크기 (한 쪽에 11개가 들어가게)
const ENTER_FOLD = 0.3 // 들어가 내려앉을 때 높이 (반쯤 접힌 팝업). 나머지는 덮어 오는 종이가 누른다

// 넘기는 종이 모양 (레퍼런스 C 구간): 바로 출발해 후반에 감속하고, 휨은 0 → 최대 → 0. 책등 쪽이 앞서고 바깥 끝이 뒤처진다
const TURN_EASE = 1.6 // 넘어가는 각도 = π·(1 − (1 − p)^TURN_EASE). 2 면 power2.out. 1.6 이면 진행률 약 35% 에 수직
const BEND_MAX = 1.6 // 책등 쪽과 바깥 끝의 기울기 차 최대값 (라디안)

const COLORS = ['#f6c9a8', '#a9d6cf', '#f3dc8a', '#c6b8e8', '#f2a7a7', '#9cc3e6']
// 떠오를 도형: 지금 만들 수 있는 도형들 (직육면체, 각기둥, 각뿔, 정다면체, 원기둥, 원뿔)
const shapeGeometries = () => [
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.BoxGeometry(1.4, 0.7, 0.8),
  new THREE.CylinderGeometry(0.55, 0.55, 1, 3),
  new THREE.ConeGeometry(0.65, 1, 4),
  new THREE.TetrahedronGeometry(0.75),
  new THREE.CylinderGeometry(0.5, 0.5, 0.9, 6),
  new THREE.OctahedronGeometry(0.7),
  new THREE.CylinderGeometry(0.45, 0.45, 1, 32),
  new THREE.DodecahedronGeometry(0.6),
  new THREE.ConeGeometry(0.5, 1, 32),
  new THREE.IcosahedronGeometry(0.65),
]

const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const easeOutBack = (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2 // 살짝 튀어 올랐다 자리 잡기
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

// 글자를 그린 투명 캔버스 텍스처
function textTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 넘기는 종이 한 장. 책등 골에서 올라와 휘어 넘어가도록 가로로 잘게 나눈 평면을 매번 다시 휜다.
// 앞면은 오른쪽에 누웠을 때, 뒷면은 넘어가서 왼쪽에 누웠을 때 위로 보인다
function turningPage(book: Book, front: THREE.Texture, back: THREE.Texture, own: Own) {
  const { w, d } = book.page
  const { curl, dip } = book.gutter
  const N = 48
  const geometry = own(new THREE.PlaneGeometry(w, d, N, 1).rotateX(-Math.PI / 2))
  const pos = geometry.attributes.position
  const column = Array.from({ length: pos.count }, (_, i) => Math.round(((pos.getX(i) + w / 2) / w) * N))
  // 뒷면은 왼쪽에 누우면 좌우가 뒤집혀 보이므로 텍스처를 좌우로 뒤집는다
  const backMap = own(back.clone())
  backMap.repeat.x = -1
  backMap.offset.x = 1
  backMap.needsUpdate = true
  const group = new THREE.Group()
  for (const mesh of [new THREE.Mesh(geometry, own(new THREE.MeshStandardMaterial({ map: front }))), new THREE.Mesh(geometry, own(new THREE.MeshStandardMaterial({ map: backMap, side: THREE.BackSide })))]) {
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  group.position.set(book.center.x, 0, book.center.z) // 높이는 아래에서 정한다 (책등 골 바닥 근처)
  book.group.add(group)

  const alpha = Math.atan((2 * dip) / curl) // 골에서 종이가 올라오는 기울기 (bookScene 의 sag 와 같은 모양)
  const xs = new Float32Array(N + 1)
  const ys = new Float32Array(N + 1)
  let height = 0
  // p: 넘긴 시간 비율 (0 오른쪽에 누움 ~ 1 왼쪽에 누움, 등속). lift: 평평한 곳에서 페이지 윗면보다 얼마나 위에 놓일지
  const set = (p: number, lift: number) => {
    const angle = Math.PI * (1 - (1 - p) ** TURN_EASE) // 종이 전체가 넘어간 각도
    const bend = BEND_MAX * Math.sin(Math.PI * p) * Math.min(1, 2 * (1 - p)) // 끝에서는 더 빨리 풀려 평평한 판으로 내려앉는다
    const gutter = alpha * (1 - 2 * p) // 누웠을 때 책등 골을 따라 올라오는 기울기 (오른쪽 +, 왼쪽 −)
    const ds = w / N
    for (let i = 1; i <= N; i++) {
      const s = (i - 0.5) * ds
      const g = Math.min(1, s / curl)
      // 고른 곡률로 휜다: 책등 쪽은 angle + bend/2 로 앞서고 바깥 끝은 angle − bend/2 로 뒤처진다
      const main = Math.min(Math.PI, Math.max(0, angle + bend * (0.5 - s / w)))
      const phi = main + gutter * (1 - g * g * (3 - 2 * g))
      xs[i] = xs[i - 1] + Math.cos(phi) * ds
      ys[i] = ys[i - 1] + Math.sin(phi) * ds
    }
    height = lift
    for (let i = 0; i < pos.count; i++) pos.setXY(i, xs[column[i]], ys[column[i]] + lift)
    pos.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }
  // 누운 종이의 평평한 곳이 페이지 윗면 높이가 되게: 휜 모양이 올라오는 높이를 재서 책등 쪽 시작점을 그만큼 내린다
  set(0, 0)
  group.position.y = book.top - ys[N]
  // 가로 위치 x(책 좌표) 바로 위를 덮은 종이의 높이. 종이가 아직 그 위까지 넘어오지 않았으면 Infinity
  const heightAt = (x: number) => {
    const local = x - group.position.x
    for (let i = 1; i <= N; i++) {
      if (xs[i] > local) continue
      const k = (xs[i - 1] - local) / (xs[i - 1] - xs[i] || 1)
      return group.position.y + height + ys[i - 1] + (ys[i] - ys[i - 1]) * k
    }
    return Infinity
  }
  return { group, set, heightAt }
}

export function buildOpening(book: Book, size: number) {
  const owned: { dispose(): void }[] = []
  const own: Own = (x) => (owned.push(x), x)
  const { w, d } = book.page
  const spine = book.center
  const leftPage = book.leftPage()!
  const eps = size * 0.002 // 겹쳐 놓은 종이 사이 간격 (깜빡이지 않게)
  book.group.updateMatrixWorld(true)

  // 1. 표지 왼쪽 반을 책등 축에 달아 덮어 둔다. 덮으면 오른쪽 종이 묶음과 넘길 종이들 위에 놓인다
  const flap = new THREE.Group()
  flap.position.set(spine.x, book.top - book.thick / 2 + (eps * (PAGES + 3)) / 2, spine.z)
  book.group.add(flap)
  flap.updateMatrixWorld(true)
  flap.attach(book.leftCover)
  const coverSize = (book.leftCover.geometry as THREE.BoxGeometry).parameters
  // 표지 글자: 덮었을 때 위로 오는 표지 아랫면에 붙인다. 책등 축으로 반 바퀴 돌면 글자가 바로 읽히게 뒤집어 둔다
  const coverTitle = new THREE.Mesh(
    own(new THREE.PlaneGeometry(coverSize.width * 0.8, coverSize.width * 0.5).rotateX(Math.PI / 2).rotateY(Math.PI)),
    own(
      new THREE.MeshStandardMaterial({
        transparent: true,
        map: own(
          textTexture(1024, 640, (ctx) => {
            ctx.fillStyle = '#fbf8f1'
            ctx.font = `bold 230px ${FONT}`
            ctx.fillText('foldy', 512, 330)
            ctx.font = `600 64px ${FONT}`
            ctx.fillText('접었다 펼치는 입체도형', 512, 470)
          }),
        ),
      }),
    ),
  )
  coverTitle.position.y = -coverSize.height / 2 - 0.005
  book.leftCover.add(coverTitle)

  // 왼쪽 종이 묶음: 첫 장이 내려앉을 때 나타나고, 내려앉는 종이마다 두꺼워진다(그 전에는 표지 안쪽만 보인다). 다 넘어오기 전까지는 빈 종이 (면지)
  const face = (leftPage.material as THREE.MeshStandardMaterial[])[2]
  const text = face.map!
  face.map = own(pageTexture(w, d, 'left', []))
  const pageY = leftPage.position.y
  const stack = (fill: number) => {
    leftPage.scale.y = 0.08 + 0.92 * fill
    leftPage.position.y = pageY - (book.thick * (1 - leftPage.scale.y)) / 2 // 아랫면은 표지 위에 그대로
  }

  // 넘어오는 종이들 (빈 종이). k = 0 이 맨 위라 먼저 넘어가고, 왼쪽에서는 아래부터 쌓인다
  const blankRight = own(pageTexture(w, d, 'right', []))
  const blankLeft = own(pageTexture(w, d, 'left', []))
  const flutter = Array.from({ length: PAGES }, (_, k) => {
    const page = turningPage(book, blankRight, blankLeft, own)
    const right = eps * (PAGES - k + 1)
    const left = -book.thick * 0.92 * (1 - (k + 1) / PAGES) + eps * (k + 1) // 그때까지 쌓인 왼쪽 묶음 위
    const start = k === 0 ? FLUTTER : FLUTTER + FIRST_TIME - FLUTTER_TIME + k * FLUTTER_GAP
    return { page, right, left, start, time: k === 0 ? FIRST_TIME : FLUTTER_TIME }
  })

  // 3. 오른쪽 쪽 위의 속표지: 앞면은 제목, 뒷면은 넘어가서 왼쪽 쪽이 될 글
  const titleMap = own(pageTexture(w, d, 'right', []))
  const ctx = (titleMap.image as HTMLCanvasElement).getContext('2d')! // 1024 너비 기준 좌표 그대로
  const h = (1024 * d) / w
  ctx.textAlign = 'center'
  ctx.fillStyle = RED
  ctx.font = `bold 30px ${FONT}`
  ctx.fillText('POP-UP BOOK', 512, h * 0.38)
  ctx.fillStyle = INK
  ctx.font = `bold 160px ${FONT}`
  ctx.fillText('foldy', 512, h * 0.5)
  ctx.font = `600 48px ${FONT}`
  ctx.fillText('입체도형 팝업북', 512, h * 0.57)
  titleMap.needsUpdate = true
  const title = turningPage(book, titleMap, text, own)

  // 2. 도형: 두 쪽 위에 타원으로 흩어 두고, 페이지에서 떠올라 둥실 뜬다. 그림자가 페이지에 떨어진다
  const edgeMaterial = own(new THREE.LineBasicMaterial({ color: INK }))
  const shapes = shapeGeometries().map((geometry, k, all) => {
    const mesh = new THREE.Mesh(own(geometry), own(new THREE.MeshStandardMaterial({ color: COLORS[k % COLORS.length], flatShading: true, roughness: 0.6 })))
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(own(new THREE.EdgesGeometry(geometry, 20)), edgeMaterial))
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const half = box.max.y * SLOT_SIZE // 들어간 자리에서 똑바로 섰을 때 높이의 반
    const reach = Math.max(box.max.x, box.max.z) * SLOT_SIZE * 1.2 // 돌아도 닿는 가로 반경
    const angle = (k / all.length) * Math.PI * 2
    const ground = new THREE.Vector3(spine.x + Math.cos(angle) * w * 0.62, book.top, spine.z + Math.sin(angle) * d * 0.3)
    const air = ground.clone().setY(2 + (k % 3) * 0.9)
    mesh.scale.setScalar(0)
    book.group.add(mesh)
    return { mesh, ground, air, half, reach, enter: 0, from: new THREE.Vector3(), via: new THREE.Vector3(), slot: new THREE.Vector3() }
  })
  // 3. 들어가는 순서와 자리: 오른쪽에 떠 있던 것부터(일어서는 속표지에 걸리기 전에 지나가게) 책등 가까운 칸부터 채운다.
  // 자리는 왼쪽 쪽 위 3 × 4 칸. 떠 있던 곳에서 위로 솟았다 내려앉는 곡선(2차 베지어)으로 간다
  const slots = [0.22, 0.5, 0.78].flatMap((s) => [-0.3, -0.1, 0.1, 0.3].map((z) => new THREE.Vector3(spine.x - w * s, book.top, spine.z + d * z)))
  const order = shapes.map((_, k) => k).sort((a, b) => shapes[b].ground.x - shapes[a].ground.x)
  order.forEach((k, n) => {
    const shape = shapes[k]
    shape.enter = ENTER + n * ENTER_GAP
    shape.from.copy(shape.air).y += Math.sin(shape.enter * 2 + k) * 0.15 // 떠 있던 마지막 자리
    shape.slot.copy(slots[n]).y += shape.half * ENTER_FOLD
    shape.via.lerpVectors(shape.from, shape.slot, 0.5).add(new THREE.Vector3(0, 2.5, 1.5)) // 위로, 보는 쪽으로 부풀어 곡선이 보이게
  })

  let done = false
  const update = (t: number) => {
    flap.rotation.z = -Math.PI * (1 - easeInOut(span(t, COVER[0], COVER[1])))
    let landed = 0
    for (const { page, right, left, start, time } of flutter) {
      const p = span(t, start, start + time)
      page.set(p, lerp(right, left, p))
      landed += span(p, 0.85, 1) // 내려앉는 마지막 순간에만 묶음이 그 장만큼 두꺼워진다
    }
    leftPage.visible = landed > 0
    stack(landed / PAGES)
    const turn = span(t, TURN[0], TURN[1])
    title.set(turn, lerp(eps, eps * (PAGES + 1), turn))
    shapes.forEach(({ mesh, ground, air, half, reach, enter, from, via, slot }, k) => {
      const a = easeInOut(span(t, enter, enter + ENTER_TIME))
      // 돌던 것은 들어가면서 기울기가 풀리고 천천히 멈춘다
      mesh.rotation.set(Math.sin(t + k) * 0.4 * (1 - a), k + 0.8 * Math.min(t, enter) + 0.6 * a, 0)
      if (a === 0) {
        const p = easeOutBack(span(t, POP + k * 0.1, POP + k * 0.1 + 0.9))
        mesh.position.lerpVectors(ground, air, p).y += Math.sin(t * 2 + k) * 0.15 * span(t, POP + 1, POP + 2)
        mesh.scale.setScalar(Math.max(0, p) * SHAPE_SIZE)
        return
      }
      // 3. 팝업북처럼: 곡선을 그리며 왼쪽 쪽으로 들어가 반쯤 접힌 채 내려앉고, 넘어오는 속표지가 덮는 만큼 마저 눌려 납작해진다.
      // 도형의 책등 쪽 끝 바로 위 종이 높이까지만 설 수 있다 (종이를 뚫지 않게)
      const b = 1 - a
      mesh.position.set(0, 0, 0).addScaledVector(from, b * b).addScaledVector(via, 2 * a * b).addScaledVector(slot, a * a)
      const size = lerp(SHAPE_SIZE, SLOT_SIZE, a)
      const room = title.heightAt(mesh.position.x + reach) - book.top - eps * 2
      // 덮어 오는 종이 아래에 있게: 종이가 도형 위까지 내려왔으면 그 높이로 눌러 내린다
      const pressed = room < mesh.position.y - book.top + half * lerp(1, ENTER_FOLD, a)
      const fold = Math.min(lerp(1, ENTER_FOLD, a), Math.max(0, room / (2 * half)))
      mesh.visible = fold > 0.08 // 거의 납작하면 모서리 선만 남아 보여서 숨긴다
      mesh.scale.set(size, size * fold, size)
      if (a === 1 || pressed) mesh.position.y = book.top + half * fold // 아랫면은 페이지 위
    })
  }

  // 4. 빈 책 그대로: 표지와 왼쪽 종이를 되돌리고 덧붙인 것을 치운다 (건너뛰기도 여기로)
  const finish = () => {
    if (done) return
    done = true
    flap.rotation.z = 0
    flap.updateMatrixWorld(true)
    book.group.attach(book.leftCover)
    book.leftCover.remove(coverTitle)
    leftPage.visible = true
    stack(1)
    face.map = text
    book.group.remove(flap, title.group, ...flutter.map((f) => f.page.group), ...shapes.map((s) => s.mesh))
  }

  update(0)
  return { update, finish, dispose: () => owned.forEach((x) => x.dispose()) }
}
