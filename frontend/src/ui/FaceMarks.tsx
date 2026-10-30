import { MARKS, type Mark } from './markFace.ts'

// 면 표시 (docs/specs/ui.md 화면 배치 5번): 아래 바의 선 긋기 옆. 켜고 표시를 고른 뒤 3D 에서 면을 누르면 그 면에 쓴다.
// 학습지 전개도(grid)만 면 글자·색칠을 담을 수 있어서, 십자형(치수로 만들기)은 켤 때 App 이 같은 모양의 grid 로 바꾼다 (선이 있으면 꺼짐)
interface Props {
  on: boolean
  onToggle: (on: boolean) => void
  enabled: boolean // 십자형에 선이 있으면 false (grid 로 바꾸면 선이 사라져서)
  mark: Mark
  onMark: (mark: Mark) => void
}

export function FaceMarks({ on, onToggle, enabled, mark, onMark }: Props) {
  return (
    <div className="line-controls face-marks">
      <button
        type="button"
        className="toggle-button"
        aria-pressed={on}
        disabled={!enabled}
        title={enabled ? undefined : '선을 지운 뒤에 쓸 수 있어요'}
        onClick={() => onToggle(!on)}
      >
        🔤 면 표시
      </button>
      {on && (
        <div className="toggle-row mark-picker" role="group" aria-label="쓸 표시">
          {MARKS.map((m) => (
            <button key={m} type="button" aria-pressed={mark === m} onClick={() => onMark(m)}>
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
