// 한 페이지에 도형·전개도 여러 개 놓기 (docs/specs/worksheets.md "여러 도형 배치", 팀과 같이 보는 제안. 아직 화면에 연결하지 않음).
// 학습지에 전개도가 여러 개(①~⑥)인 문제를 책 페이지에 늘어놓을 때, 개수마다 줄·칸을 미리 정하지 않고
// 줄 수 × 칸 수 후보 중 도형이 가장 크게 들어가는 것을 고른다. 마지막 줄은 가운데로. three.js 없음 (pageSlots.test.ts)

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const MAX_ITEMS = 6
const GAP = 0.06 // 칸 사이 간격 = 페이지 짧은 변 × 이 값

// 페이지 page 안에 가로/세로 비율 aspects 인 물건들을 놓을 칸. 칸 안에서는 비율을 지켜 가장 크게, 가운데 정렬
export function pageSlots(page: Rect, aspects: number[]): Rect[] {
  const n = Math.min(aspects.length, MAX_ITEMS)
  if (n === 0) return []
  const gap = Math.min(page.w, page.h) * GAP
  let best: { scale: number; rows: number; cols: number } | null = null
  for (let rows = 1; rows <= n; rows++) {
    const cols = Math.ceil(n / rows)
    if ((rows - 1) * cols >= n) continue // 빈 줄이 생기는 조합은 빼기
    const cw = (page.w - gap * (cols - 1)) / cols
    const ch = (page.h - gap * (rows - 1)) / rows
    // 모든 물건이 같은 높이 1 이라고 볼 때 들어가는 배율 (가장 작은 것 기준)
    const scale = Math.min(...aspects.slice(0, n).map((a) => Math.min(cw / a, ch)))
    if (!best || scale > best.scale + 1e-9) best = { scale, rows, cols }
  }
  const { rows, cols } = best!
  const cw = (page.w - gap * (cols - 1)) / cols
  const ch = (page.h - gap * (rows - 1)) / rows
  return aspects.slice(0, n).map((a, i) => {
    const r = Math.floor(i / cols)
    const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols // 마지막 줄 개수
    const c = i - r * cols
    const rowStart = page.x + ((cols - inRow) * (cw + gap)) / 2 // 마지막 줄 가운데
    const s = Math.min(cw / a, ch)
    const [w, h] = [s * a, s]
    return { x: rowStart + c * (cw + gap) + (cw - w) / 2, y: page.y + r * (ch + gap) + (ch - h) / 2, w, h }
  })
}
