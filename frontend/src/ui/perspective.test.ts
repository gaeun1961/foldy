// 종이 펴기(원근 보정) 계산 검사. 실행: frontend 폴더에서 `npm test`
import { applyH, flatSize, homography, warp, type Pixels, type Pt } from './perspective.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const near = (a: Pt, b: Pt, msg: string) => check(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6, `${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)

// 정사각형 → 사다리꼴: 네 귀퉁이가 그대로 옮겨지고, 되돌리면 제자리
const square: Pt[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]
const trapezoid: Pt[] = [
  { x: 30, y: 10 },
  { x: 170, y: 20 },
  { x: 200, y: 180 },
  { x: 5, y: 160 },
]
const H = homography(square, trapezoid)
square.forEach((p, i) => near(applyH(H, p), trapezoid[i], `귀퉁이 ${i}`))
const back = homography(trapezoid, square)
for (const p of [
  { x: 50, y: 50 },
  { x: 12, y: 80 },
  { x: 99, y: 3 },
])
  near(applyH(back, applyH(H, p)), p, '왕복')

// 같은 자리 네 귀퉁이로 펴면 그림이 그대로 (4×3 그림, 픽셀마다 다른 값)
const W = 4
const Hh = 3
const data = new Uint8ClampedArray(W * Hh * 4).map((_, i) => (i * 7) % 256)
const src: Pixels = { data, width: W, height: Hh }
const same = warp(
  src,
  [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: Hh },
    { x: 0, y: Hh },
  ],
  W,
  Hh,
)
check(
  same.data.every((v, i) => v === data[i]),
  '같은 귀퉁이로 펴면 그림이 바뀌면 안 됨',
)

// 결과 크기: 마주 보는 변 평균, 긴 변 제한
// 가로 (140.4 + 196.0) / 2 ≈ 168, 세로 (152.1 + 162.8) / 2 ≈ 157
const size = flatSize(trapezoid, 1600)
check(size.w === 168 && size.h === 157, `크기 ${JSON.stringify(size)}`)
check(flatSize(trapezoid, 100).w === 100, '긴 변 제한')

// 네 점이 한 줄이면 펼 수 없다
let threw = false
try {
  homography(square, [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ])
} catch {
  threw = true
}
check(threw, '한 줄 위 네 점은 오류')

console.log('ok: 종이 펴기 (네 귀퉁이 옮기기, 왕복, 그대로 펴기, 결과 크기, 한 줄 오류)')
