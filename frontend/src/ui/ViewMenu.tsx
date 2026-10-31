import { useRef } from 'react'
import type { FoldMode } from './FoldControls'
import type { PiMode } from '../viewer'
import { SPEEDS, type Speed } from './player'
import { ViewOptions, type ViewOptionValues } from './ViewOptions'

// "보기" 메뉴 (docs/specs/ui.md 화면 배치 6번): 자주 안 쓰는 것을 아래 바 밖으로 뺀다. 누르면 위로 펼쳐진다.
// 접는 방식, 속도, 면 표시, 보기 옵션. 공식 설명 중에는 속도만 (그 공식에 필요한 것만)
interface Props {
  lessonOn: boolean
  pi: { mode: PiMode; onChange: (mode: PiMode) => void } | null // 원이 들어간 도형에서 표기 고르기
  steps: number // 단계 수 (0 이면 접는 방식을 고를 수 없다)
  mode: FoldMode
  onModeChange: (mode: FoldMode) => void
  speed: Speed
  onSpeedChange: (speed: Speed) => void
  marking: boolean
  markEnabled: boolean
  onMarkingChange: (on: boolean) => void
  values: ViewOptionValues
  onValues: (values: ViewOptionValues) => void
}

export function ViewMenu({ lessonOn, pi, steps, mode, onModeChange, speed, onSpeedChange, marking, markEnabled, onMarkingChange, values, onValues }: Props) {
  const menu = useRef<HTMLDetailsElement>(null)
  return (
    <details className="view-menu" ref={menu}>
      <summary>보기</summary>
      <div className="view-popup">
        {pi && (
          <div className="toggle-row" role="group" aria-label="원주율 표기">
            {(['pi', '3.14'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={pi.mode === m} onClick={() => pi.onChange(m)}>
                {m === 'pi' ? '중등(π)' : '초등(3.14)'}
              </button>
            ))}
          </div>
        )}
        {!lessonOn && steps > 0 && (
          <div className="toggle-row" role="group" aria-label="접는 방식">
            {(['step', 'all'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => onModeChange(m)}>
                {m === 'step' ? '단계별' : '한 번에'}
              </button>
            ))}
          </div>
        )}
        <div className="toggle-row" role="group" aria-label="속도">
          {(Object.keys(SPEEDS) as Speed[]).map((s) => (
            <button key={s} type="button" aria-pressed={speed === s} onClick={() => onSpeedChange(s)}>
              {SPEEDS[s].label}
            </button>
          ))}
        </div>
        {!lessonOn && (
          <>
            <button
              type="button"
              className="menu-button"
              aria-pressed={marking}
              disabled={!markEnabled}
              title={markEnabled ? undefined : '직육면체·정육면체에서, 선을 지운 뒤에 쓸 수 있어요'}
              onClick={() => {
                onMarkingChange(!marking)
                if (menu.current) menu.current.open = false // 고를 표시가 아래 바에 나오고, 3D 를 가리지 않게 닫는다
              }}
            >
              면 표시
            </button>
            <ViewOptions values={values} onChange={onValues} />
          </>
        )}
      </div>
    </details>
  )
}
