import { useRef } from 'react'

export type Offset = { x: number; y: number }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// 끌어서 부모 패널(아래 바)을 옮기는 손잡이. 화면 밖으로는 못 나가고, 두 번 누르면 제자리 (ui.md 화면 배치)
// ponytail: 창 크기를 줄이면 옮겨 둔 바가 화면 밖에 남을 수 있다. 두 번 눌러 제자리로 돌린다
export function DragHandle({ offset, onMove }: { offset: Offset; onMove: (offset: Offset) => void }) {
  const start = useRef<{ x: number; y: number; offset: Offset; rect: DOMRect } | null>(null)
  return (
    <div
      className="drag-handle"
      role="separator"
      aria-label="끌어서 바 옮기기, 두 번 누르면 제자리"
      title="끌어서 옮기기 · 두 번 누르면 제자리"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, y: e.clientY, offset, rect: e.currentTarget.parentElement!.getBoundingClientRect() }
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s) return
        const dx = clamp(e.clientX - s.x, -s.rect.left, innerWidth - s.rect.right)
        const dy = clamp(e.clientY - s.y, -s.rect.top, innerHeight - s.rect.bottom)
        onMove({ x: s.offset.x + dx, y: s.offset.y + dy })
      }}
      onPointerUp={() => (start.current = null)}
      onDoubleClick={() => onMove({ x: 0, y: 0 })}
    />
  )
}
