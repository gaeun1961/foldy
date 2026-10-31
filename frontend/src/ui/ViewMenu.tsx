import type { FoldMode } from './FoldControls'
import { ViewOptions, type ViewOptionValues } from './ViewOptions'

// "보기" 메뉴 (docs/specs/ui.md 화면 배치 6번): 자주 안 쓰는 것을 아래 바 밖으로 뺀다. 누르면 위로 펼쳐진다.
// 접는 방식, 보기 옵션. 선 긋기·면 표시·빠르기·과정은 아래 바에 바로 둔다 (App.tsx)
interface Props {
  lessonOn: boolean
  steps: number // 단계 수 (0 이면 접는 방식을 고를 수 없다)
  mode: FoldMode
  onModeChange: (mode: FoldMode) => void
  values: ViewOptionValues
  onValues: (values: ViewOptionValues) => void
}

export function ViewMenu({ lessonOn, steps, mode, onModeChange, values, onValues }: Props) {
  if (lessonOn) return null // 공식 설명 중에는 고를 것이 없다 (빠르기·과정은 아래 바에)
  return (
    <details className="view-menu">
      <summary>보기</summary>
      <div className="view-popup">
        {steps > 0 && (
          <div className="toggle-row" role="group" aria-label="접는 방식">
            {(['step', 'all'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => onModeChange(m)}>
                {m === 'step' ? '단계별' : '한 번에'}
              </button>
            ))}
          </div>
        )}
        <ViewOptions values={values} onChange={onValues} />
      </div>
    </details>
  )
}
