// 여러 도형 배치 검사 (worksheets.md "여러 도형 배치"). 실행: frontend 폴더에서 `npm test`
import { pageSlots, type Rect } from './pageSlots.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const page: Rect = { x: 0, y: 0, w: 3, h: 4 } // 세로로 긴 책 페이지
const inside = (r: Rect) => r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= page.w + 1e-9 && r.y + r.h <= page.h + 1e-9
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9

// 1~6개, 정육면체 전개도(가로 4 : 세로 3) 비율: 페이지 안, 서로 안 겹침, 비율 그대로
for (let n = 1; n <= 6; n++) {
  const slots = pageSlots(page, Array(n).fill(4 / 3))
  check(slots.length === n, `${n}개`)
  slots.forEach((s, i) => {
    check(inside(s), `${n}개 중 ${i} 페이지 안`)
    check(Math.abs(s.w / s.h - 4 / 3) < 1e-9, `${n}개 중 ${i} 비율`)
    slots.slice(i + 1).forEach((t) => check(!overlap(s, t), `${n}개 겹침`))
  })
}
// 하나면 페이지 폭을 거의 다 쓴다 (작게 그리지 않는다)
check(pageSlots(page, [4 / 3])[0].w === 3, '하나는 폭 가득')
// 개수가 늘수록 하나하나는 작아진다 (같은 비율)
const width = (n: number) => pageSlots(page, Array(n).fill(4 / 3))[0].w
check(width(2) <= width(1) && width(4) <= width(2) && width(6) <= width(4), '많을수록 작게')
// 6개 넘게 와도 6개까지만
check(pageSlots(page, Array(9).fill(1)).length === 6, '최대 6개')
// 3개(세로 페이지)는 한 줄에 셋보다 세로로 쌓는 편이 크다
const three = pageSlots(page, Array(3).fill(4 / 3))
check(three[1].y > three[0].y, '세 개는 위아래로')

console.log('ok: 여러 도형 배치 (1~6개 페이지 안·안 겹침·비율, 하나는 크게, 많을수록 작게, 최대 6개)')
