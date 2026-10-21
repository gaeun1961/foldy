import { useEffect, useRef } from 'react'
import { foldPercent, unfoldOf } from './foldStatus.ts'

// 접기 슬라이더 + 펼치기·접기 버튼 (docs/specs/ui.md). 값은 뷰어의 펼침 값 s (0 = 입체, 1 = 전개도).
interface Props {
  unfold: number
  onChange: (unfold: number) => void
}

const FULL_MS = 1500 // 끝에서 끝까지 걸리는 시간

export function FoldControls({ unfold, onChange }: Props) {
  const frame = useRef(0)
  const stop = () => cancelAnimationFrame(frame.current)
  useEffect(() => stop, [])

  // 지금 위치에서 target 까지 부드럽게. 남은 거리에 비례한 시간
  const animateTo = (target: number) => {
    stop()
    const from = unfold
    const ms = Math.abs(target - from) * FULL_MS
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2 // ease-in-out
      onChange(from + (target - from) * eased)
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  const percent = foldPercent(unfold)
  return (
    <div className="fold-controls">
      <label className="slider-row">
        <span>접기</span>
        <output>{percent}%</output>
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          aria-valuetext={`접기 ${percent}%`}
          onPointerDown={stop}
          onChange={(e) => {
            stop()
            onChange(unfoldOf(Number(e.target.value)))
          }}
        />
      </label>
      <div className="fold-buttons">
        <button type="button" className="secondary" disabled={percent <= 0} onClick={() => animateTo(1)}>
          ◀ 펼치기
        </button>
        <button type="button" className="primary" disabled={percent >= 100} onClick={() => animateTo(0)}>
          접기 ▶
        </button>
      </div>
    </div>
  )
}
