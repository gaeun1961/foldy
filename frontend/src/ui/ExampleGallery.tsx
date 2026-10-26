import { EXAMPLES } from '../shared/examples'
import type { ShapeScene } from '../shared/types'
import { Viewer } from '../viewer'

// 예시 도형 썸네일 (docs/specs/ui.md 화면 배치 2번). 썸네일마다 작은 뷰어를 두고(공용 렌더러라 캔버스는 하나), 누르면 그 도형을 올린다
interface Props {
  onPick: (scene: ShapeScene) => void
}

export function ExampleGallery({ onPick }: Props) {
  return (
    <section className="examples">
      <h2>예시 도형</h2>
      <div className="example-list">
        {EXAMPLES.map(({ label, scene }) => (
          <button key={label} type="button" onClick={() => onPick(scene)}>
            <div className="example-thumb">
              {/* 반쯤 접힌 모습: 다 접으면 전개도 범위에 맞춘 카메라 탓에 작게 보이고, 다 펼치면 도형 구분이 어렵다 */}
              <Viewer scene={scene} unfold={0.5} interactive={false} showHiddenEdges={false} />
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
