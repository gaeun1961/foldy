// 여러 도형 배치 미리보기 (lab, 서비스 빌드에 안 들어감). viewer/pageSlots.ts 를 전개도로 그려 본다
// 윗줄: 정육면체 전개도 1~6개, 아랫줄: 모양이 다른 직육면체 전개도를 섞어 1~6개
import type { NetFace } from '../src/shared/types.ts'
import { netVariant } from '../src/viewer/gridNet.ts'
import { pageSlots } from '../src/viewer/pageSlots.ts'

const PAGE = { x: 0.1, y: 0.1, w: 2.8, h: 3.8 } // 책 오른쪽 페이지(3:4) 여백 안쪽
const NS = 'http://www.w3.org/2000/svg'
const el = (name: string, attrs: Record<string, string | number>, text?: string) => {
  const e = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (text) e.textContent = text
  return e
}

function draw(out: HTMLElement, make: (i: number) => NetFace[]) {
  for (let n = 1; n <= 6; n++) {
    const nets = Array.from({ length: n }, (_, i) => make(i))
    const boxes = nets.map((faces) => {
      const x0 = Math.min(...faces.map((f) => f.x))
      const y0 = Math.min(...faces.map((f) => f.y))
      return { x0, y0, w: Math.max(...faces.map((f) => f.x + f.w)) - x0, h: Math.max(...faces.map((f) => f.y + f.h)) - y0 }
    })
    const slots = pageSlots(PAGE, boxes.map((b) => b.w / b.h))
    const svg = el('svg', { viewBox: '0 0 3 4' })
    slots.forEach((slot, i) => {
      const k = slot.w / boxes[i].w
      const g = el('g', { transform: `translate(${slot.x} ${slot.y}) scale(${k}) translate(${-boxes[i].x0} ${-boxes[i].y0})` })
      nets[i].forEach((f) => g.append(el('rect', { x: f.x, y: f.y, width: f.w, height: f.h, class: 'face', 'stroke-width': 0.012 / k })))
      svg.append(g, el('text', { x: slot.x - 0.02, y: slot.y + 0.1, class: 'num' }, '①②③④⑤⑥'[i]))
    })
    const rows = [...new Set(slots.map((s) => s.y.toFixed(3)))].map((y) => slots.filter((s) => s.y.toFixed(3) === y).length)
    const fig = document.createElement('figure')
    const cap = document.createElement('figcaption')
    cap.textContent = `${n}개 · 줄 ${rows.join('+')} · 높이 ${((slots[0].h / PAGE.h) * 100).toFixed(0)}%`
    fig.append(svg, cap)
    out.append(fig)
  }
}

draw(document.getElementById('cube')!, (i) => netVariant(i * 2, [1, 1, 1]))
const DIMS: [number, number, number][] = [[2, 1, 1], [1, 1, 2], [3, 1, 1], [2, 2, 1], [1, 2, 1], [2, 1, 3]]
draw(document.getElementById('mixed')!, (i) => netVariant(i, DIMS[i]))
