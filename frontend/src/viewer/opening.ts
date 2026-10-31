// 오프닝 (docs/specs/viewer.md "오프닝"): 처음 들어왔을 때 빈 책 장면 위에서 한 번 돈다. 끝나면 빈 책 그대로 남는다.
// 1 표지가 열리고 종이 여러 장이 넘어온다 → 2 도형들이 페이지에서 떠올라 날아다닌다 → 3 속표지가 넘어가며 도형을 하나씩 흡수한다 → 4 빈 책
// 이미지 파일 없이 책 장면의 상자·캔버스 텍스처와 three.js 기본 도형으로만 만든다
import * as THREE from 'three'
import { FONT, INK, pageTexture, type BookMenuItem, type buildBook } from './bookScene'

type Book = ReturnType<typeof buildBook>
type Own = <T extends { dispose(): void }>(x: T) => T

// 시간표 (초)
const COVER = [0.3, 1.5] // 표지가 열린다
const FLUTTER = 0.9 // 종이가 넘어오기 시작 (장마다 FLUTTER_GAP 늦게, FLUTTER_TIME 동안)
const FLUTTER_GAP = 0.2
const FLUTTER_TIME = 1.0 // 레퍼런스(KOKUYO Turn the page) 한 장 넘김 약 1초
const FIRST_TIME = 1.8 // 첫 장은 천천히: 왼쪽에 처음 펴지는 종이가 갑자기 생기는 것처럼 보이지 않게. 다음 장들은 그만큼 늦게 출발
const PAGES = 5 // 넘어오는 종이 장 수
const POP = 3.5 // 도형이 하나씩 떠오르기 시작. 그 뒤로 곡선을 그리며 날아다닌다
const TURN = [7.9, 10.3] // 속표지가 넘어간다. 넘어가기 시작하면 도형이 종이가 지나가는 순서대로 하나씩 흡수된다
export const OPENING_SECONDS = 10.5
const SIZES = [3.2, 1.1, 2.3, 1.6, 0.9, 2.8, 1.4, 3.4, 1.9, 1.0, 2.5] // 도형마다 다른 크기 (배)
// 도형마다 책에서 튀어나오는 때 (POP 부터 초): 2~3개씩 묶여 들쭉날쭉한 순서로
const POP_AT = [0.25, 0.6, 0, 0.85, 0.45, 0, 1.05, 0.25, 0.6, 0, 0.6]
// 도형마다 다른 자리: 책등에서 떨어진 정도(쪽 너비 배), 방향 흔들기(라디안), 떠 있는 높이
const SPREAD = [0.55, 0.78, 0.38, 0.7, 0.48, 0.82, 0.62, 0.42, 0.74, 0.58, 0.66]
const TWIST = [0.2, -0.25, 0.1, 0.3, -0.15, 0.05, -0.3, 0.25, -0.1, 0.15, -0.2]
const HEIGHTS = [2.0, 3.6, 2.7, 4.2, 1.7, 3.1, 2.3, 3.9, 2.9, 1.5, 3.4]
export const LOW_ANGLE = 24 // 오프닝 동안 카메라 높이각(도): 낮게 봐야 공중에 뜬 높이가 보인다. 속표지가 넘어가는 동안 원래 각도로 올라간다
const WANDER = 1.0 // 날아다니는 폭
const ABSORB_TIME = 1.0 // 오른쪽 도형: 책 가운데로 늘어나 빨려 들어가는 시간 (넘어가는 종이가 그 도형에 닿을 때 끝난다)
const REACH = 0.55 // 그중 앞부분: 몸은 공중에 두고 앞끝이 책 가운데까지 늘어난다. 나머지: 몸도 빨려 들어간다
const ABSORB_MIN = 0.35 // 넘기기 시작하자마자 닿는 도형도 이만큼은 날아 들어간다
const SINK_TIME = 1.0 // 왼쪽 도형: 곡선을 그리며 왼쪽 쪽 안으로 들어가는 시간 (종이가 오기 전에 끝나게 줄어들 수 있다)
const SINK_GAP = 0.06 // 왼쪽 도형이 하나씩 들어가는 간격 (넘기기 시작할 때부터)

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
    for (let i = 0; i < pos.count; i++) pos.setXY(i, xs[column[i]], ys[column[i]] + lift)
    pos.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }
  // 누운 종이의 평평한 곳이 페이지 윗면 높이가 되게: 휜 모양이 올라오는 높이를 재서 책등 쪽 시작점을 그만큼 내린다
  set(0, 0)
  group.position.y = book.top - ys[N]
  return { group, set }
}

// 차례에서 도형을 고를 때 (TODO-44): 오프닝의 속표지처럼 종이가 넘어가 왼쪽에 눕는다. 차례에서 고른 도형까지 지나가는 도형마다 한 장씩
// (spreads: 차례 0번째 도형부터 고른 도형까지의 쪽) 장마다 PAGE_TURN_GAP 늦게 넘어간다. 맨 위 장 앞면은 차례, 장 i 뒷면은 i번째 도형의 왼쪽 쪽,
// 다음 장 앞면은 그 도형의 오른쪽 쪽(쪽 번호만). 아래에는 고른 도형의 오른쪽 쪽을 미리 찍어 도형 화면으로 바뀔 때 글이 갑자기 생기지 않게 한다
const PAGE_TURN_TIME = 1.0 // 한 장 넘김
const PAGE_TURN_GAP = 0.12
export function buildPageTurn(book: Book, size: number, spreads: { text: string[]; pageNumbers?: [number, number]; menu?: BookMenuItem[] }[]) {
  const owned: { dispose(): void }[] = []
  const own: Own = (x) => (owned.push(x), x)
  const { w, d } = book.page
  const face = (book.pages()[0].material as THREE.MeshStandardMaterial[])[2]
  const right = (k: number) => own(pageTexture(w, d, 'right', [], [], [], spreads[k].pageNumbers?.[1]))
  const eps = size * 0.002
  const sheets = spreads.length
  // k = 0 이 맨 위라 먼저 넘어가고, 왼쪽에서는 나중에 넘어간 장이 위에 쌓인다
  const pages = spreads.map(({ text, pageNumbers, menu }, k) => ({
    page: turningPage(book, k === 0 ? face.map! : right(k - 1), own(pageTexture(w, d, 'left', text, [], [], pageNumbers?.[0], undefined, menu)), own),
    right: eps * (sheets - k),
    left: eps * (k + 1),
    start: k * PAGE_TURN_GAP,
  }))
  face.map = right(sheets - 1)
  const update = (t: number) => {
    for (const { page, right, left, start } of pages) {
      const p = span(t, start, start + PAGE_TURN_TIME)
      page.set(p, lerp(right, left, p))
    }
  }
  update(0)
  return { update, seconds: (sheets - 1) * PAGE_TURN_GAP + PAGE_TURN_TIME, dispose: () => owned.forEach((x) => x.dispose()) }
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
  ctx.fillStyle = INK
  ctx.font = `bold 30px ${FONT}`
  ctx.fillText('POP-UP BOOK', 512, h * 0.38)
  ctx.fillStyle = INK
  ctx.font = `bold 160px ${FONT}`
  ctx.fillText('foldy', 512, h * 0.5)
  ctx.font = `600 48px ${FONT}`
  ctx.fillText('입체도형 팝업북', 512, h * 0.57)
  titleMap.needsUpdate = true
  const title = turningPage(book, titleMap, text, own)

  // 2. 도형: 두 쪽 위에 타원으로 흩어 두고, 페이지에서 떠올라 곡선을 그리며 날아다닌다. 그림자가 페이지에 떨어진다
  const edgeMaterial = own(new THREE.LineBasicMaterial({ color: INK }))
  // 넘기는 종이 각도 θ 가 되는 시각 (set 의 angle 을 거꾸로 푼 것)
  const turnTime = (theta: number) => TURN[0] + (1 - (1 - theta / Math.PI) ** (1 / TURN_EASE)) * (TURN[1] - TURN[0])
  const shapes = shapeGeometries().map((geometry, k, all) => {
    const mesh = new THREE.Mesh(own(geometry), own(new THREE.MeshStandardMaterial({ color: COLORS[k % COLORS.length], flatShading: true, roughness: 0.6 })))
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(own(new THREE.EdgesGeometry(geometry, 20)), edgeMaterial))
    const angle = (k / all.length) * Math.PI * 2 + TWIST[k % TWIST.length]
    const r = SPREAD[k % SPREAD.length]
    const ground = new THREE.Vector3(spine.x + Math.cos(angle) * w * r, book.top, spine.z + Math.sin(angle) * d * r * 0.5)
    const air = ground.clone().setY(HEIGHTS[k % HEIGHTS.length])
    // 3. 흡수. 책등을 축으로 도는 종이가 이 도형이 떠 있는 방향(θ)에 닿는 시각
    const dx = air.x - spine.x
    const dy = air.y - book.top
    const theta = Math.atan2(dy, dx)
    // 오른쪽 도형: 그 시각까지 넘어가는 종이 위 자기 자리로 빨려 들어간다 (종이가 쓸고 가며 잡아챈다)
    const start = Math.max(TURN[0], turnTime(theta) - ABSORB_TIME)
    // 도형은 바깥 그룹(holder)에 넣는다: holder 가 자리·늘이기(빨려 가는 방향으로)를, 안쪽 mesh 가 스스로 도는 회전과 크기를 맡는다
    const holder = new THREE.Group()
    holder.add(mesh)
    mesh.scale.setScalar(0)
    book.group.add(holder)
    return { holder, mesh, ground, air, size: SIZES[k % SIZES.length], left: theta > Math.PI / 2, theta, start, end: Math.max(start + ABSORB_MIN, turnTime(theta)) }
  })
  // 왼쪽 도형은 넘기기 시작할 때부터 책등 가까운 것부터 하나씩. 종이가 그 자리를 덮기 전에 끝나게
  shapes
    .filter((s) => s.left)
    .sort((a, b) => a.theta - b.theta)
    .forEach((s, n) => {
      s.start = TURN[0] + n * SINK_GAP
      // 떠 있던 방향에 종이가 닿기 0.15초 전에 다 들어간다 (내려갈수록 책등에서 본 각도가 커져 종이에서 멀어진다)
      s.end = Math.max(s.start + 0.4, Math.min(s.start + SINK_TIME, turnTime(s.theta) - 0.15))
    })
  // 날아다니는 자리: 떠오른 곳을 중심으로, 빠르기가 다른 두 곡선을 겹쳐 도형마다 다르게 부드럽게 휘돈다
  const flying = (k: number, t: number, out: THREE.Vector3) => {
    const { ground, air } = shapes[k]
    const p = easeOutBack(span(t, POP + POP_AT[k], POP + POP_AT[k] + 0.9))
    const W = WANDER * span(t, POP + POP_AT[k] + 0.6, POP + POP_AT[k] + 2)
    const f = 0.55 + 0.07 * (k % 4)
    return out.lerpVectors(ground, air, p).add(
      new THREE.Vector3(
        (Math.sin(t * f + k * 1.3) + 0.45 * Math.sin(t * f * 2.3 + k * 0.7)) * W,
        (Math.sin(t * f * 1.6 + k * 2.1) * 0.4 + 0.15 * Math.sin(t * 3.1 + k)) * W,
        (Math.cos(t * f * 0.8 + k * 1.7) + 0.4 * Math.cos(t * 1.9 + k * 2.6)) * W * 0.8,
      ),
    )
  }
  const from = new THREE.Vector3()
  const center = new THREE.Vector3(spine.x, book.top, spine.z) // 블랙홀: 책 가운데 (책등 위)
  const head = new THREE.Vector3()
  const spot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  const smooth = (a: number, b: number, x: number) => {
    const u = span(x, a, b)
    return u * u * (3 - 2 * u)
  }

  let done = false
  const update = (t: number) => {
    flap.rotation.z = -Math.PI * (1 - easeInOut(span(t, COVER[0], COVER[1])))
    let landed = 0
    for (const { page, right, left, start, time } of flutter) {
      const p = span(t, start, start + time)
      page.set(p, lerp(right, left, p))
      landed += p === 1 ? 1 : 0 // 다 내려앉은 뒤에만 묶음이 그 장만큼 두꺼워진다 (내려앉은 종이가 윗면을 덮고 있어 바뀌는 게 안 보인다. 미리 보이면 흰 면이 갑자기 생긴 것처럼 보인다)
    }
    leftPage.visible = landed > 0
    stack(landed / PAGES)
    const turn = span(t, TURN[0], TURN[1])
    title.set(turn, lerp(eps, eps * (PAGES + 1), turn))
    shapes.forEach(({ holder, mesh, size, left, start, end }, k) => {
      // 축마다 빠르기가 다른 회전, 살짝 늘었다 줄었다 (말랑한 느낌)
      mesh.rotation.set(Math.sin(t * 0.6 + k) * 0.5, k + t * (0.5 + 0.12 * (k % 3)), Math.cos(t * 0.45 + k * 1.3) * 0.3)
      const u = span(t, start, end)
      if (u === 0) {
        flying(k, t, holder.position)
        mesh.scale.setScalar(Math.max(0, easeOutBack(span(t, POP + POP_AT[k], POP + POP_AT[k] + 0.9))) * size)
        const breathe = 0.06 * Math.sin(t * 2.6 + k)
        holder.scale.set(1 - breathe / 2, 1 + breathe, 1 - breathe / 2)
        return
      }
      flying(k, start, from)
      holder.visible = u < 1
      if (left) {
        // 왼쪽: 바로 아래 왼쪽 쪽으로 가라앉는다. 물에 잠기듯 처음엔 천천히, 닿으면서 납작하게 퍼지며 종이 속으로 사라진다.
        // 내려갈수록 책등에서 본 각도가 커져 넘어오는 종이에서 멀어진다
        const a = easeInOut(u)
        spot.set(Math.min(spine.x - w * 0.15, Math.max(spine.x - w * 0.85, from.x)), book.top, Math.min(spine.z + d * 0.4, Math.max(spine.z - d * 0.4, from.z)))
        holder.position.lerpVectors(from, spot, a)
        holder.quaternion.identity()
        mesh.scale.setScalar(size * (1 - smooth(0.5, 1, a)))
        const press = smooth(0.6, 1, a)
        holder.scale.set(1 + 0.4 * press, 1 - 0.7 * press, 1 + 0.4 * press)
        return
      }
      // 오른쪽: 책 가운데(책등 위)가 블랙홀. 몸은 공중에서 계속 날고 앞끝이 가운데까지 길게 늘어난 뒤(REACH),
      // 몸도 가운데로 빨려 들어가며 가늘어지다 사라진다. 책등에서 도형 쪽으로 뻗은 선을 따라 늘어나므로,
      // 넘어가는 종이가 그 방향에 닿기 전에 끝나면 종이를 뚫지 않는다
      flying(k, t, from)
      head.lerpVectors(from, center, 1 - (1 - span(u, 0, REACH)) ** 2) // 앞끝: 빠르게 뻗었다가 가운데에 닿는다
      from.lerp(center, span(u, REACH, 1) ** 2) // 몸: 점점 빨라지며 빨려 들어간다
      dir.subVectors(head, from)
      const length = dir.length()
      if (length > 1e-4) holder.quaternion.setFromUnitVectors(UP, dir.divideScalar(length))
      holder.position.lerpVectors(from, head, 0.5)
      const long = Math.max(1, length / size)
      const thin = (1 - 0.7 * smooth(REACH, 1, u)) / Math.sqrt(long)
      holder.scale.set(thin, long, thin)
      mesh.scale.setScalar(size * (1 - smooth(0.85, 1, u)))
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
    book.group.remove(flap, title.group, ...flutter.map((f) => f.page.group), ...shapes.map((s) => s.holder))
  }

  update(0)
  // 카메라를 낮게 둘 정도 (1 = LOW_ANGLE, 0 = 원래 각도). 속표지가 넘어가는 동안 올라간다
  const low = (t: number) => 1 - easeInOut(span(t, TURN[0], TURN[1]))
  return { update, finish, low, dispose: () => owned.forEach((x) => x.dispose()) }
}
