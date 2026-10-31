// 문제 칸 안 추천 네모 검사 (worksheets.md "추천 네모"). 실행: frontend 폴더에서 `npm test`
// 실제 학습지 두 장(29번 겨냥도+전개도, 3-2 계단형)으로 값을 맞췄다. 여기서는 같은 모양을 그려 본다
import { findShapeBoxes, sideways } from './suggestBoxes.ts'
import type { Pixels } from './perspective.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}

// 종이(밝기 paper, 왼쪽이 어두운 조명) 위에 그리기
function sheet(W: number, H: number, paper: (x: number) => number): Pixels & { fill: (x0: number, y0: number, w: number, h: number, rgb: number[]) => void } {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = paper(x)
      data.set([v, v, v - 4, 255], (y * W + x) * 4)
    }
  const fill = (x0: number, y0: number, w: number, h: number, rgb: number[]) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) data.set([...rgb, 255], (y * W + x) * 4)
  }
  return { data, width: W, height: H, fill }
}

const inside = (b: { x: number; y: number; w: number; h: number }, x: number, y: number, w: number, h: number) =>
  b.x <= x && b.y <= y && b.x + b.w >= x + w && b.y + b.h >= y + h

// 29번 꼴: 글자 줄(검은 가는 선) 아래 왼쪽 겨냥도, 오른쪽 십자 전개도. 오른쪽 날개는 조명 탓에 옅다. 빨간 채점 표시가 지나간다
{
  const [W, H] = [480, 330]
  const s = sheet(W, H, (x) => 150 + Math.round((50 * x) / W))
  for (let line = 0; line < 3; line++) for (let x = 40 + line * 5; x < 440; x += 14) s.fill(x, 20 + line * 30, 8, 2, [40, 40, 40]) // 글자 (줄마다 어긋남, 실제 글처럼)
  for (let x = 205; x < 440; x += 14) s.fill(x, 140, 8, 2, [40, 40, 40]) // 전개도 바로 위 글 줄 (넓혀도 넘지 않아야)
  s.fill(60, 200, 90, 70, [104, 96, 85]) // 겨냥도
  s.fill(220, 210, 170, 40, [110, 104, 92]) // 전개도 가로 띠
  s.fill(310, 160, 50, 160, [120, 112, 100]) // 세로 띠
  s.fill(390, 210, 40, 40, [160, 154, 142]) // 옅은 오른쪽 날개
  for (let x = 220; x < 430; x += 6) s.fill(x, 230, 3, 1, [60, 60, 60]) // 접는 점선
  for (let i = 0; i < 200; i++) s.fill(100 + i, 40 + (i >> 1), 3, 3, [200, 60, 70]) // 빨간 펜
  const t = performance.now()
  const boxes = findShapeBoxes(s)
  const ms = performance.now() - t
  check(boxes.length === 2, `도형 둘: ${JSON.stringify(boxes)}`)
  const px = (b: (typeof boxes)[number]) => ({ x: b.x * W, y: b.y * H, w: b.w * W, h: b.h * H })
  check(inside(px(boxes[0]), 60, 200, 90, 70), `① 겨냥도를 감싼다: ${JSON.stringify(px(boxes[0]))}`)
  check(inside(px(boxes[1]), 220, 160, 210, 160), `② 전개도를 옅은 날개까지 감싼다: ${JSON.stringify(px(boxes[1]))}`)
  check(px(boxes[0]).x + px(boxes[0]).w <= px(boxes[1]).x + 1e-6, '넓힌 네모가 옆 도형으로 넘어가지 않는다')
  check(px(boxes[1]).y > 141, `② 가 바로 위 글 줄까지 커지지 않는다: ${JSON.stringify(px(boxes[1]))}`)
  check(ms < 500, `빠르다: ${ms.toFixed(0)}ms`)
  check(!sideways(s), '글 줄이 가로면 바로 선 사진')

  // 같은 학습지를 옆으로 눕힌 사진 (돌리기 없이 문제 칸을 그림): 누운 것을 알아챈다 → 추천 대신 "돌려 주세요"
  // (누운 글 줄·손글씨는 도형과 픽셀로 못 가려, 휴대폰 실측에서 글 줄을 도형으로 잡았다)
  const lying = { data: new Uint8ClampedArray(s.data.length), width: H, height: W }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lying.data.set(s.data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), (x * H + y) * 4)
  check(sideways(lying), '글 줄이 세로면 누운 사진')

  // 어두운 휴대폰 사진 (같은 그림을 밝기 60%로): 밝기 값이 종이에 대한 비율이라 그대로 찾는다
  const dim = { data: s.data.map((v, i) => (i % 4 === 3 ? v : Math.round(v * 0.6))), width: W, height: H }
  check(findShapeBoxes(dim).length === 2, `어두운 사진도 도형 둘: ${JSON.stringify(findShapeBoxes(dim))}`)
}

// 문제 칸을 넉넉히 그린 경우: 오른쪽 가장자리 책 그림자 띠(위에서 아래까지), 오른쪽 아래 흐린 그림자 얼룩, 전개도 바로 위 문제 글 줄
{
  const [W, H] = [480, 360]
  const s = sheet(W, H, () => 200)
  for (let x = 440; x < 480; x++) s.fill(x, 0, 1, H, [150 - (x - 440), 145 - (x - 440), 140 - (x - 440)]) // 그림자 띠
  for (let y = 280; y < 350; y++)
    for (let x = 300; x < 420; x++) {
      const d = Math.hypot(x - 360, y - 315) / 60 // 가운데가 어둡고 서서히 밝아지는 얼룩
      const v = Math.round(200 - 50 * Math.max(0, 1 - d))
      s.fill(x, y, 1, 1, [v, v, v - 4])
    }
  for (let x = 40; x < 420; x += 12) s.fill(x, 120, 9, 12, [35, 35, 35]) // 문제 글 줄 (y 120~132)
  s.fill(120, 150, 180, 90, [120, 114, 104]) // 전개도 (글 줄 바로 아래)
  s.fill(200, 0, 90, 60, [125, 120, 110]) // 위 문제의 남은 그림 (칸 위 가장자리에 닿음)
  const boxes = findShapeBoxes(s)
  check(boxes.length === 1, `그림자·얼룩·위 문제 그림은 도형이 아니다: ${JSON.stringify(boxes)}`)
  check(inside({ x: boxes[0].x * W, y: boxes[0].y * H, w: boxes[0].w * W, h: boxes[0].h * H }, 120, 150, 180, 90), '전개도는 감싼다')
  check(boxes[0].y * H > 131, `넓혀도 위 글 줄까지 올라가지 않는다: 위 ${(boxes[0].y * H).toFixed(0)}`)
}

// 문제 칸을 꼭 맞게 그려 전개도가 오른쪽·아래 가장자리에 같이 닿아도 도형이다 (29번 회귀, #155)
{
  const [W, H] = [400, 300]
  const s = sheet(W, H, () => 200)
  for (let x = 30; x < 370; x += 13) s.fill(x, 20, 8, 2, [40, 40, 40]) // 문제 글
  s.fill(40, 170, 90, 70, [104, 96, 85]) // 겨냥도
  s.fill(220, 160, 180, 50, [120, 112, 100]) // 전개도 가로 띠 (오른쪽 끝까지)
  s.fill(290, 110, 50, 190, [120, 112, 100]) // 세로 띠 (아래 끝까지)
  const boxes = findShapeBoxes(s)
  check(boxes.length === 2, `오른쪽·아래에 닿은 전개도도 찾는다: ${JSON.stringify(boxes)}`)
}

// 색칠 없는 학습지(선만) → 추천 없음 (학생이 직접 감싼다)
{
  const s = sheet(300, 200, () => 210)
  for (let x = 50; x < 250; x++) s.fill(x, 60, 1, 1, [30, 30, 30])
  for (let y = 60; y < 160; y++) s.fill(50, y, 1, 1, [30, 30, 30])
  check(findShapeBoxes(s).length === 0, '선만 있으면 빈 목록')
}

// 도형이 여섯 개 넘게 있어도 여섯까지
{
  const s = sheet(480, 320, () => 200)
  for (let i = 0; i < 8; i++) s.fill(20 + (i % 4) * 115, 30 + Math.floor(i / 4) * 150, 60, 60, [120, 120, 125])
  const boxes = findShapeBoxes(s)
  check(boxes.length === 6, `여섯까지: ${boxes.length}`)
  check(boxes[0].y < boxes[4].y && boxes[0].x < boxes[1].x, '위 줄 왼쪽부터')
}

console.log('ok: 추천 네모 (누운 사진 알아채기·어두운 사진·두 가장자리에 닿은 전개도, 겨냥도·전개도 둘, 옅은 날개, 옆 도형 안 넘김, 책 그림자 띠·흐린 얼룩·위 가장자리 그림 빼기, 글 줄 앞에서 멈춤, 선만이면 없음, 여섯까지)')
