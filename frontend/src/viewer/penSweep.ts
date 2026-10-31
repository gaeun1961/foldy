// 펜으로 그려 내기 (viewer.md 책 장면 "펜으로 그려 내기"): 펜이 왼쪽 위에서 오른쪽 아래(\ 방향)로 나아가면서
// 그에 수직인 / 방향으로 오가며 칠한다. 이 지그재그 길을 굵은 선의 마스크로 써서 지나간 자리만 그림이 드러나고,
// 펜은 같은 길을 따라간다 (길이 하나라 펜과 드러나는 자리가 어긋나지 않는다). three.js·DOM 없음

export type Point = { x: number; y: number }

// 네모(x, y, w, h)를 / 방향 줄 passes 개로 덮는 지그재그 점들과, 줄 사이를 빈틈없이 덮는 선 굵기.
// SVG 는 y 가 아래로 커지므로 x + y = c 인 줄이 / 방향이고, c 가 커질수록 오른쪽 아래(\ 방향)로 간다
export function penSweep(x: number, y: number, w: number, h: number, passes = 9): { points: Point[]; width: number } {
  const step = (w + h) / passes
  const points: Point[] = []
  for (let k = 0; k < passes; k++) {
    const c = x + y + step * (k + 0.5)
    const left = Math.max(x, c - (y + h)) // 줄이 네모 안에 드는 x 범위
    const right = Math.min(x + w, c - y)
    const low = { x: left, y: c - left } // 왼쪽 아래 끝
    const high = { x: right, y: c - right } // 오른쪽 위 끝
    // 첫 줄은 왼쪽 아래 → 오른쪽 위(/ 위로), 다음 줄은 반대로 내려온다
    points.push(...(k % 2 === 0 ? [low, high] : [high, low]))
  }
  // 줄 사이 거리는 step/√2. 조금 더 굵게 해서 틈이 안 보이게
  return { points, width: (step / Math.SQRT2) * 1.25 }
}

export const pathOf = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')

// 꺾은선의 길이와, 처음부터 dist 만큼 간 점 (펜 위치). dist 가 길이를 넘으면 끝점
export const pathLength = (points: Point[]) => points.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0), 0)
export function pointAt(points: Point[], dist: number): Point {
  let left = Math.max(0, dist)
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (left <= seg && seg > 0) return { x: a.x + ((b.x - a.x) * left) / seg, y: a.y + ((b.y - a.y) * left) / seg }
    left -= seg
  }
  return points[points.length - 1]
}
