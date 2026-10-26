// 선 긋기 한 줄 (docs/specs/ui.md 화면 배치 5번): "선 긋기" 토글 + 모서리 나누기(켜져 있을 때) + 선 지우기
type Divisions = 2 | 3 | 4

interface Props {
  drawing: boolean
  onDrawingChange: (drawing: boolean) => void
  divisions: Divisions
  onDivisionsChange: (divisions: Divisions) => void
  lineCount: number
  onEraseLast: () => void // 마지막에 그은 선부터 하나씩 지운다 (면에 걸친 선은 통째로)
}

export function LineControls({ drawing, onDrawingChange, divisions, onDivisionsChange, lineCount, onEraseLast }: Props) {
  return (
    <div className="line-controls">
      <button type="button" className="toggle-button" aria-pressed={drawing} onClick={() => onDrawingChange(!drawing)}>
        ✏️ 선 긋기
      </button>
      {drawing && (
        <div className="toggle-row" role="group" aria-label="모서리 나누기">
          {([2, 3, 4] as const).map((n) => (
            <button key={n} type="button" aria-pressed={divisions === n} onClick={() => onDivisionsChange(n)}>
              {n}등분
            </button>
          ))}
        </div>
      )}
      <button type="button" className="secondary" disabled={lineCount === 0} onClick={onEraseLast}>
        선 지우기
      </button>
    </div>
  )
}
