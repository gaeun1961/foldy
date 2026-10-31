// 한 페이지에 도형·전개도 여러 개 놓기 (docs/specs/worksheets.md "여러 도형 배치". 팀 합의, 화면 연결은 다음 단계).
// 학습지에 전개도가 여러 개(①~⑥)인 문제를 책 페이지에 늘어놓는다. 칸을 똑같이 나누지 않고 사진 갤러리처럼 줄로 채운다.
// 순서대로 줄을 나누는 모든 경우를 보고, 같은 문제의 보기(①~⑥)는 공정하게 모두 같은 높이로 놓되 그 높이가 **가장 커지는** 나누기를 고른다
// (줄 폭과 페이지 높이를 넘지 않게).
// 덩어리는 페이지 가운데. three.js 없음 (pageSlots.test.ts)

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const MAX_ITEMS = 6
const GAP = 0.04 // 도형 사이 간격 = 페이지 짧은 변 × 이 값

// 순서를 지키며 n 개를 줄로 나누는 모든 경우 (n ≤ 6 이라 32가지 이하)
function partitions(n: number): number[][] {
  const out: number[][] = []
  for (let mask = 0; mask < 1 << (n - 1); mask++) {
    const rows: number[] = []
    let count = 1
    for (let i = 0; i < n - 1; i++) {
      if (mask & (1 << i)) {
        rows.push(count)
        count = 1
      } else count++
    }
    rows.push(count)
    out.push(rows)
  }
  return out
}

// 페이지 page 안에 가로/세로 비율 aspects 인 물건들을 놓을 자리 (비율 그대로, 순서대로 위에서 아래·왼쪽에서 오른쪽)
export function pageSlots(page: Rect, aspects: number[]): Rect[] {
  const items = aspects.slice(0, MAX_ITEMS)
  const n = items.length
  if (n === 0) return []
  const gap = Math.min(page.w, page.h) * GAP
  // 줄 나누기마다: 모두 같은 높이 h 로 놓을 때 줄 폭(가장 긴 줄)과 페이지 높이가 허락하는 가장 큰 h. 가장 큰 것을 고른다
  let best: { h: number; rows: number[] } | null = null
  for (const rows of partitions(n)) {
    let k = 0
    const byWidth = rows.map((count) => (page.w - gap * (count - 1)) / items.slice(k, (k += count)).reduce((a, b) => a + b, 0))
    const h = Math.min(...byWidth, (page.h - gap * (rows.length - 1)) / rows.length)
    // 크기가 같으면 앞줄을 채우는 쪽 (2+2+1 이 1+2+2 보다 자연스럽다)
    const fuller = best && rows.findIndex((c, r) => c !== best!.rows[r])
    const ahead = !!best && fuller !== null && fuller >= 0 && rows[fuller] > best.rows[fuller]
    if (!best || h > best.h + 1e-9 || (Math.abs(h - best.h) <= 1e-9 && ahead)) best = { h, rows }
  }
  const { rows, h: same } = best!
  const heights = rows.map(() => same)
  const blockH = same * rows.length + gap * (rows.length - 1)
  let y = page.y + (page.h - blockH) / 2
  let i = 0
  const out: Rect[] = []
  rows.forEach((count, r) => {
    const h = heights[r]
    const rowW = items.slice(i, i + count).reduce((a, b) => a + b * h, 0) + gap * (count - 1)
    let x = page.x + (page.w - rowW) / 2 // 줄여서 폭이 남으면 가운데
    for (let c = 0; c < count; c++, i++) {
      out.push({ x, y, w: items[i] * h, h })
      x += items[i] * h + gap
    }
    y += h + gap
  })
  return out
}
