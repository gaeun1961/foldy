import type { ShapeScene } from '../shared/types'
import { ITEM_LABELS } from '../viewer'
import { shapeName } from './foldStatus.ts'

// 여러 도형 문제에서 접을 도형 고르기 (docs/specs/worksheets.md 여러 도형, ui.md 화면 배치 4번 위).
// 고른 하나만 책에서 접히고 홀로그램에도 그것만 나온다. 번호는 학생이 네모를 그린 순서(①부터)
interface Props {
  scenes: ShapeScene[]
  index: number
  onPick: (index: number) => void
}

export function ShapeTabs({ scenes, index, onPick }: Props) {
  return (
    <div className="toggle-row shape-tabs" role="group" aria-label="접을 도형 고르기">
      {scenes.map((scene, i) => (
        <button key={i} type="button" aria-pressed={i === index} onClick={() => onPick(i)}>
          {ITEM_LABELS[i]} {shapeName(scene)}
        </button>
      ))}
    </div>
  )
}
