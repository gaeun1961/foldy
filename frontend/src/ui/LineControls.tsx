// 선 긋기 묶음 (docs/specs/ui.md 화면 배치 5번): "선 긋기" 토글 + 선 지우기. 모서리 나누기·다른 길은 켜졌을 때 그 아래 줄에
type Divisions = 2 | 3 | 4

interface Props {
  drawing: boolean
  onDrawingChange: (drawing: boolean) => void
  divisions: Divisions
  onDivisionsChange: (divisions: Divisions) => void
  lineCount: number
  onEraseLast: () => void // 마지막에 그은 선부터 하나씩 지운다 (면에 걸친 선은 통째로)
  route: { index: number; count: number } | null // 방금 다른 면을 이은 선의 길 후보 (2개 이상일 때만)
  onNextRoute: () => void
}

export function LineControls({ drawing, onDrawingChange, divisions, onDivisionsChange, lineCount, onEraseLast, route, onNextRoute }: Props) {
  return (
    <div className="line-controls">
      <button type="button" className="toggle-button" aria-pressed={drawing} onClick={() => onDrawingChange(!drawing)}>
        선 긋기
      </button>
      <button type="button" className="secondary" disabled={lineCount === 0} onClick={onEraseLast}>
        선 지우기
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
      {route && (
        <button type="button" className="route" onClick={onNextRoute} aria-label={`다른 길로 바꾸기, ${route.count}개 중 ${route.index + 1}번째`}>
          다른 길 ({route.index + 1}/{route.count})
        </button>
      )}
    </div>
  )
}
