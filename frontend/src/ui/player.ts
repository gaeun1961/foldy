// 값 하나를 목표들로 차례로 움직이는 애니메이션 (접기의 unfold, 설명 모드의 progress).
// 구간마다 이징, 구간 사이에 pauseMs 멈춤, 시간은 거리에 비례 (값 1 당 msPerUnit). ui.md 친절한 설명 원칙

// 속도별 시간. 보통도 TODO-3 처음 버전(끝까지 1.5초)보다 느리다
export const SPEEDS = {
  slow: { label: '느리게', allMs: 5000, stepMs: 1800, pauseMs: 700 },
  normal: { label: '보통', allMs: 3000, stepMs: 1200, pauseMs: 500 },
  fast: { label: '빠르게', allMs: 1500, stepMs: 700, pauseMs: 300 },
}
export type Speed = keyof typeof SPEEDS

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2) // ease-in-out

// 돌려주는 함수로 멈춘다. 끝까지 가면 onDone
export function animate(from: number, targets: number[], msPerUnit: number, pauseMs: number, onChange: (v: number) => void, onDone: () => void) {
  if (targets.length === 0) {
    onDone()
    return () => {}
  }
  let i = 0
  let t0 = -1 // 첫 프레임 시각에서 시작
  let frame = 0
  const step = (now: number) => {
    if (t0 < 0) t0 = now
    const to = targets[i]
    const ms = Math.abs(to - from) * msPerUnit
    const t = ms > 0 ? Math.min(1, Math.max(0, (now - t0) / ms)) : 1
    onChange(t < 1 ? from + (to - from) * ease(t) : to)
    if (t >= 1) {
      if (++i >= targets.length) return onDone()
      from = to
      t0 = now + pauseMs
    }
    frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}
