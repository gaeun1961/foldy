// 보기 옵션 체크박스 한 줄 (docs/specs/ui.md 화면 배치 6번). 값은 그대로 ViewerProps 로 넘긴다.
// 새 옵션은 ViewerProps 에 불리언을 더하고,
// 아래 ViewOptionValues·ITEMS 와 App.tsx 의 기본값(ui.md)에 한 줄씩 더한다
export interface ViewOptionValues {
  showHiddenEdges: boolean
  showVertexLabels: boolean
  showMatchingEdges: boolean
}

const ITEMS: { key: keyof ViewOptionValues; label: string }[] = [
  { key: 'showHiddenEdges', label: '보이지 않는 모서리 점선' },
  { key: 'showVertexLabels', label: '꼭짓점 라벨' },
  { key: 'showMatchingEdges', label: '맞닿는 모서리 색' },
]

interface Props {
  values: ViewOptionValues
  onChange: (values: ViewOptionValues) => void
}

export function ViewOptions({ values, onChange }: Props) {
  return (
    <fieldset className="view-options">
      <legend>보기</legend>
      {ITEMS.map(({ key, label }) => (
        <label key={key}>
          <input type="checkbox" checked={values[key]} onChange={(e) => onChange({ ...values, [key]: e.target.checked })} />
          {label}
        </label>
      ))}
    </fieldset>
  )
}
