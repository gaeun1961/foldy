import { useRef, useState } from 'react'
import type { NetFace, ShapeScene } from '../shared/types'
import { crossScene, gridScene, overlaps, rectOf, SHAPES, SLIDER, type BoxShape } from './manualScene.ts'

// 직접 만들기 (docs/specs/ui.md 화면 배치 3번). 사진 인식(LLM) 없이 쓰는 기본 길.
// ① 치수로 만들기: 도형 드롭다운 + 치수 슬라이더 → 십자형. ② 전개도 그리기: 칸 위를 끌어 직사각형 면을 그린다 → 그대로 접힌다.
// 사진 인식 결과(scene)가 오면 십자형은 ①, 학습지 전개도(grid)는 ②에 채워진다
type Mode = 'size' | 'draw'
interface Props {
  scene: ShapeScene | null
  onScene: (scene: ShapeScene | null, how: 'size' | 'draw') => void // size: 치수만 바뀜(펼침 그대로), draw: 전개도가 바뀜(펼친 상태로)
}

export function ManualInput({ scene, onScene }: Props) {
  const [mode, setMode] = useState<Mode>(scene?.net.layout === 'grid' ? 'draw' : 'size')
  return (
    <section className="manual-input" id="manual-input" aria-label="직접 만들기">
      <h2>직접 만들기</h2>
      <div className="toggle-row" role="group" aria-label="만드는 방법">
        {(['size', 'draw'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === 'size' ? '치수로 만들기' : '전개도 그리기'}
          </button>
        ))}
      </div>
      {mode === 'size' ? <SizeForm scene={scene} onScene={(s) => onScene(s, 'size')} /> : <NetDrawer scene={scene} onScene={(s) => onScene(s, 'draw')} />}
    </section>
  )
}

// ① 치수로 만들기. 지금 도형이 십자형이면 그 값으로 채운다. 도형이 없으면 "이 치수로 만들기"
function SizeForm({ scene, onScene }: { scene: ShapeScene | null; onScene: (scene: ShapeScene) => void }) {
  const current = scene && scene.net.layout === 'cross' && (scene.shape === 'cuboid' || scene.shape === 'cube') ? scene : null
  const [draft, setDraft] = useState<{ shape: BoxShape; size: Record<string, number> }>({ shape: 'cuboid', size: { ...SHAPES[0].size } })
  const shape = current ? (current.shape as BoxShape) : draft.shape
  const size = (current ? current.size : draft.size) as Record<string, number>
  const def = SHAPES.find((s) => s.shape === shape)!
  const change = (nextShape: BoxShape, nextSize: Record<string, number>) => {
    if (current) onScene(crossScene(nextShape, nextSize as never, current))
    else setDraft({ shape: nextShape, size: nextSize })
  }

  return (
    <div className="size-form">
      <label className="shape-select">
        입체도형
        <select value={shape} onChange={(e) => change(e.target.value as BoxShape, { ...SHAPES.find((s) => s.shape === e.target.value)!.size })}>
          {SHAPES.map((s) => (
            <option key={s.shape} value={s.shape}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {def.sliders.map(({ key, label }) => (
        <label key={key} className="slider-row">
          <span>{label}</span>
          <input
            type="range"
            min={SLIDER.min}
            max={SLIDER.max}
            step={SLIDER.step}
            value={size[key]}
            onChange={(e) => change(shape, { ...size, [key]: Number(e.target.value) })}
          />
          <output>{size[key]}</output>
        </label>
      ))}
      {!current && (
        <button type="button" className="primary-button" onClick={() => onScene(crossScene(draft.shape, draft.size as never))}>
          이 치수로 만들기
        </button>
      )}
    </div>
  )
}

// ② 전개도 그리기: 칸 위를 끌어서 직사각형 면을 그린다. 면을 누르면 지운다. 다른 면과 겹치게는 못 그린다.
// 칸은 12 × 9부터. 면이 오른쪽·아래 끝 가까이 오면 늘 2칸씩 여유가 남게 늘어난다 (칸이 모자라지 않게)
const CELL = 20 // SVG 안 칸 크기 (화면에서는 폭에 맞게 늘어난다)

function NetDrawer({ scene, onScene }: { scene: ShapeScene | null; onScene: (scene: ShapeScene | null) => void }) {
  const faces: NetFace[] = scene?.net.layout === 'grid' ? scene.net.faces : []
  const COLS = Math.max(12, ...faces.map((f) => Math.ceil(f.x + f.w) + 2))
  const ROWS = Math.max(9, ...faces.map((f) => Math.ceil(f.y + f.h) + 2))
  const [drag, setDrag] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  const cellAt = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * COLS)
    const y = Math.floor(((e.clientY - r.top) / r.height) * ROWS)
    return { x: Math.max(0, Math.min(COLS - 1, x)), y: Math.max(0, Math.min(ROWS - 1, y)) }
  }
  const set = (next: NetFace[]) => onScene(next.length ? gridScene(next) : null)
  const preview = drag && rectOf(drag.a, drag.b)
  const blocked = !!preview && faces.some((f) => overlaps(f, preview))

  return (
    <div className="net-drawer">
      <p className="drawer-help">칸 위를 끌어서 면을 그려요. 면을 누르면 지워져요</p>
      <svg
        ref={svg}
        viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
        role="img"
        aria-label={`전개도 그리기 칸, 면 ${faces.length}개`}
        onPointerDown={(e) => {
          const c = cellAt(e)
          const hit = faces.findIndex((f) => overlaps(f, { ...c, w: 1, h: 1 }))
          if (hit >= 0) return set(faces.filter((_, i) => i !== hit)) // 면을 누르면 지운다
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag({ a: c, b: c })
        }}
        onPointerMove={(e) => drag && setDrag({ ...drag, b: cellAt(e) })}
        onPointerUp={() => {
          if (preview && !blocked) set([...faces, preview])
          setDrag(null)
        }}
      >
        {[...Array(COLS + 1).keys()].map((i) => (
          <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={ROWS * CELL} className="grid-line" />
        ))}
        {[...Array(ROWS + 1).keys()].map((i) => (
          <line key={`h${i}`} x1={0} y1={i * CELL} x2={COLS * CELL} y2={i * CELL} className="grid-line" />
        ))}
        {faces.map((f, i) => (
          <g key={i}>
            <rect x={f.x * CELL} y={f.y * CELL} width={f.w * CELL} height={f.h * CELL} className={`net-face${f.fill ? ' fill' : ''}`} />
            {f.text && (
              <text x={(f.x + f.w / 2) * CELL} y={(f.y + f.h / 2) * CELL} className="net-face-text">
                {f.text}
              </text>
            )}
          </g>
        ))}
        {preview && (
          <rect x={preview.x * CELL} y={preview.y * CELL} width={preview.w * CELL} height={preview.h * CELL} className={`net-preview${blocked ? ' blocked' : ''}`} />
        )}
      </svg>
      <button type="button" className="secondary-button" disabled={!faces.length} onClick={() => set([])}>
        모두 지우기
      </button>
    </div>
  )
}
