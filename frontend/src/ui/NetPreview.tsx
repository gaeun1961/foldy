import type { ShapeScene } from '../shared/types'
import { crossToGrid } from './manualScene.ts'

// 인식한 전개도를 평면 그림으로 (worksheets.md W4). 사진과 나란히 보고 잘못 읽었는지 사람이 알아채게 한다
// (잘못 읽은 전개도도 접히면 앱은 모른다, W0 3-2 사례). 직육면체·정육면체만, 십자형은 같은 모양 grid 로 바꿔 그린다
export function NetPreview({ scene }: { scene: ShapeScene }) {
  if (scene.shape !== 'cuboid' && scene.shape !== 'cube') return null
  const grid = scene.net.layout === 'grid' ? scene : crossToGrid(scene)
  if (grid.net.layout !== 'grid') return null
  const { faces, cornerLabels = [], lines = [] } = grid.net
  const x0 = Math.min(...faces.map((f) => f.x))
  const y0 = Math.min(...faces.map((f) => f.y))
  const w = Math.max(...faces.map((f) => f.x + f.w)) - x0
  const h = Math.max(...faces.map((f) => f.y + f.h)) - y0
  const pad = Math.max(w, h) * 0.08
  const font = Math.min(...faces.map((f) => Math.min(f.w, f.h))) * 0.45
  return (
    <figure className="net-preview">
      <svg viewBox={`${x0 - pad} ${y0 - pad} ${w + 2 * pad} ${h + 2 * pad}`} role="img" aria-label="인식한 전개도">
        {faces.map((f, i) => (
          <g key={i}>
            <rect x={f.x} y={f.y} width={f.w} height={f.h} className={f.fill ? 'filled' : undefined} />
            {f.text && (
              <text x={f.x + f.w / 2} y={f.y + f.h / 2} fontSize={font}>
                {f.text}
              </text>
            )}
          </g>
        ))}
        {lines.map((l, i) => (
          <line key={i} x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y} className="net-line" />
        ))}
        {cornerLabels.map((c, i) => (
          <text key={i} x={c.x} y={c.y} fontSize={font * 0.6} className="corner">
            {c.text}
          </text>
        ))}
      </svg>
      <figcaption>인식한 전개도예요. 사진과 모양·글자가 같은지 봐 주세요. 다르면 아래 전개도 그리기에서 고쳐요</figcaption>
    </figure>
  )
}
