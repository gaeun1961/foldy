import { useRef, useState } from 'react'
import type { NetFace, ShapeScene } from '../shared/types'
import { CELL, crossScene, gridScene, overlaps, PHOTO_W, rectOf, SHAPES, SLIDER, type BoxShape, type PhotoFit } from './manualScene.ts'

// 직접 만들기 (docs/specs/ui.md 화면 배치 3번). 사진 인식(LLM) 없이 쓰는 기본 길.
// ① 치수로 만들기: 도형 드롭다운 + 치수 슬라이더 → 십자형. ② 전개도 그리기: 칸 위를 끌어 직사각형 면을 그린다 → 그대로 접힌다.
// 사진 인식 결과(scene)가 오면 십자형은 ①, 학습지 전개도(grid)는 ②에 채워진다
// 사진을 올렸으면 ② 칸 밑에 반투명하게 깔아서 따라 그린다 (TODO-35)
type Mode = 'size' | 'draw'
interface Props {
  scene: ShapeScene | null
  photo: string | null // 올린 학습지 사진 주소
  onScene: (scene: ShapeScene | null, how: 'size' | 'draw') => void // size: 치수만 바뀜(펼침 그대로), draw: 전개도가 바뀜(펼친 상태로)
  fit: PhotoFit // 사진 위치. 3D 에서도 같은 자리에 깔려고 App 이 들고 있다 (TODO-36)
  onFit: (fit: PhotoFit) => void
}

export function ManualInput({ scene, photo, onScene, fit, onFit }: Props) {
  const [mode, setMode] = useState<Mode>(photo || scene?.net.layout === 'grid' ? 'draw' : 'size')
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
      {mode === 'size' ? <SizeForm scene={scene} onScene={(s) => onScene(s, 'size')} /> : (
        <NetDrawer scene={scene} onScene={(s) => onScene(s, 'draw')} photo={photo} fit={fit} onFit={onFit} />
      )}
    </section>
  )
}

// ① 치수로 만들기. 지금 도형이 십자형이면 그 값으로 채운다. 도형이 없으면 "이 치수로 만들기"
function SizeForm({ scene, onScene }: { scene: ShapeScene | null; onScene: (scene: ShapeScene) => void }) {
  // 지금 도형이 치수로 만든 것(십자형·정다면체 기본 전개도)이면 그 값으로 채운다
  const current = scene && scene.net.layout !== 'grid' && SHAPES.some((s) => s.shape === scene.shape) ? scene : null
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

interface DrawerProps {
  scene: ShapeScene | null
  onScene: (scene: ShapeScene | null) => void
  photo: string | null
  fit: PhotoFit
  onFit: (fit: PhotoFit) => void
}

function NetDrawer({ scene, onScene, photo, fit, onFit }: DrawerProps) {
  const faces: NetFace[] = scene?.net.layout === 'grid' ? scene.net.faces : []
  const COLS = Math.max(12, ...faces.map((f) => Math.ceil(f.x + f.w) + 2))
  const ROWS = Math.max(9, ...faces.map((f) => Math.ceil(f.y + f.h) + 2))
  const [drag, setDrag] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null)
  const [moving, setMoving] = useState(!!photo && faces.length === 0) // 사진 맞추기 중(끌면 사진이 움직임). 사진을 막 올렸으면 이것부터
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null) // 사진을 끄는 중이면 시작한 점 (SVG 단위)
  const svg = useRef<SVGSVGElement>(null)

  const pointAt = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * COLS * CELL, y: ((e.clientY - r.top) / r.height) * ROWS * CELL }
  }
  const cellAt = (e: React.PointerEvent) => {
    const p = pointAt(e)
    const x = Math.floor(p.x / CELL)
    const y = Math.floor(p.y / CELL)
    return { x: Math.max(0, Math.min(COLS - 1, x)), y: Math.max(0, Math.min(ROWS - 1, y)) }
  }
  const set = (next: NetFace[]) => onScene(next.length ? gridScene(next) : null)
  const preview = drag && rectOf(drag.a, drag.b)
  const blocked = !!preview && faces.some((f) => overlaps(f, preview))
  const c = PHOTO_W / 2 // 사진 가운데 (정사각형 상자 안에 비율대로 들어간다)

  return (
    <div className="net-drawer">
      {photo && (
        <div className="toggle-row" role="group" aria-label="사진 위에서 할 일">
          <button type="button" aria-pressed={moving} onClick={() => setMoving(true)}>
            ✋ 사진 맞추기
          </button>
          <button type="button" aria-pressed={!moving} onClick={() => setMoving(false)}>
            ✏️ 면 그리기
          </button>
        </div>
      )}
      <p className="drawer-help">
        {moving ? '사진을 끌어 옮기고, 아래에서 크기와 방향을 칸에 맞춰요' : photo ? '사진 속 면을 따라 칸 위를 끌어 그려요. 면을 누르면 지워져요' : '칸 위를 끌어서 면을 그려요. 면을 누르면 지워져요'}
      </p>
      <svg
        ref={svg}
        className={moving ? 'moving' : undefined}
        viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
        role="img"
        aria-label={`전개도 그리기 칸, 면 ${faces.length}개`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          if (moving) return setPan(pointAt(e))
          const cell = cellAt(e)
          const hit = faces.findIndex((f) => overlaps(f, { ...cell, w: 1, h: 1 }))
          if (hit >= 0) return set(faces.filter((_, i) => i !== hit)) // 면을 누르면 지운다
          setDrag({ a: cell, b: cell })
        }}
        onPointerMove={(e) => {
          if (pan) {
            const p = pointAt(e)
            onFit({ ...fit, x: fit.x + p.x - pan.x, y: fit.y + p.y - pan.y })
            setPan(p)
          } else if (drag) setDrag({ ...drag, b: cellAt(e) })
        }}
        onPointerUp={() => {
          if (preview && !blocked) set([...faces, preview])
          setDrag(null)
          setPan(null)
        }}
      >
        {photo && (
          <image
            href={photo}
            width={PHOTO_W}
            height={PHOTO_W}
            className="trace-photo"
            transform={`translate(${fit.x} ${fit.y}) rotate(${fit.angle} ${c} ${c}) translate(${c} ${c}) scale(${fit.scale}) translate(${-c} ${-c})`}
          />
        )}
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
      {moving ? (
        <>
          <label className="slider-row">
            <span>크기</span>
            <input type="range" min={0.5} max={4} step={0.05} value={fit.scale} onChange={(e) => onFit({ ...fit, scale: Number(e.target.value) })} />
            <output>{fit.scale.toFixed(1)}배</output>
          </label>
          <label className="slider-row">
            <span>방향</span>
            <input type="range" min={-180} max={180} step={1} value={fit.angle} onChange={(e) => onFit({ ...fit, angle: Number(e.target.value) })} />
            <output>{fit.angle}°</output>
          </label>
          <button type="button" className="primary-button" onClick={() => setMoving(false)}>
            다 맞췄어요, 면 그리기
          </button>
        </>
      ) : (
        <button type="button" className="secondary-button" disabled={!faces.length} onClick={() => set([])}>
          모두 지우기
        </button>
      )}
    </div>
  )
}
