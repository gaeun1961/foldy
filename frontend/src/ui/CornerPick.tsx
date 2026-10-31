import { useRef, useState } from 'react'
import { flatSize, warp, type Pt } from './perspective'
import { canvasToFile, MAX_SIDE } from './photoPrep'

// 종이 펴기 (docs/specs/mobile.md M3): 사진 위 네 손잡이를 학습지 네 귀퉁이에 맞추고 "펴기"를 누르면
// 비스듬히 찍힌 종이를 반듯하게 편 사진을 onDone 으로 넘긴다. 귀퉁이는 사진 비율 0~1 (왼쪽 위부터 시계 방향)
interface Props {
  url: string
  onDone: (file: File) => void
  onCancel: () => void
}

const START: Pt[] = [
  { x: 0.08, y: 0.08 },
  { x: 0.92, y: 0.08 },
  { x: 0.92, y: 0.92 },
  { x: 0.08, y: 0.92 },
]

export function CornerPick({ url, onDone, onCancel }: Props) {
  const [corners, setCorners] = useState<Pt[]>(START)
  const [active, setActive] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const img = useRef<HTMLImageElement>(null)

  const pointAt = (e: React.PointerEvent) => {
    const r = img.current!.getBoundingClientRect()
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }
  }

  const flatten = async () => {
    const el = img.current
    if (!el) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 0)) // "펴는 중…"을 먼저 그리고 계산
    const [W, H] = [el.naturalWidth, el.naturalHeight]
    const src = document.createElement('canvas')
    src.width = W
    src.height = H
    const ctx = src.getContext('2d')!
    ctx.drawImage(el, 0, 0)
    const px = corners.map((p) => ({ x: p.x * W, y: p.y * H }))
    const { w, h } = flatSize(px, MAX_SIDE)
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const flat = warp(ctx.getImageData(0, 0, W, H), px, w, h)
    out.getContext('2d')!.putImageData(new ImageData(flat.data as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0)
    onDone(await canvasToFile(out, 'flat.jpg'))
  }

  return (
    <div className="corner-pick-wrap">
      <div
        className="corner-pick"
        onPointerMove={(e) => active !== null && setCorners((cs) => cs.map((c, i) => (i === active ? pointAt(e) : c)))}
        onPointerUp={() => setActive(null)}
      >
        <img ref={img} src={url} alt="펼 학습지 사진" draggable={false} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none">
          <polygon points={corners.map((c) => `${c.x},${c.y}`).join(' ')} />
        </svg>
        {corners.map((c, i) => (
          <span
            key={i}
            className={`corner-handle${active === i ? ' active' : ''}`}
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
            onPointerDown={(e) => {
              if (busy) return
              e.currentTarget.parentElement!.setPointerCapture(e.pointerId)
              setActive(i)
            }}
          />
        ))}
      </div>
      <div className="pick-buttons">
        <button type="button" className="primary-button" disabled={busy} onClick={flatten}>
          {busy ? '펴는 중…' : '펴기'}
        </button>
        <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
          그대로 쓰기
        </button>
      </div>
    </div>
  )
}
