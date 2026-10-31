// 여러 도형 배치 미리보기 (lab, 서비스 빌드에 안 들어감). viewer/pageSlots.ts 를 정육면체 전개도 11가지로 그려 본다
import { netVariant } from '../src/viewer/gridNet.ts'
import { pageSlots } from '../src/viewer/pageSlots.ts'

const PAGE = { x: 0.15, y: 0.15, w: 2.7, h: 3.7 } // 페이지 여백 안쪽
const out = document.getElementById('out')!
const NS = 'http://www.w3.org/2000/svg'
const el = (name: string, attrs: Record<string, string | number>, text?: string) => {
  const e = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (text) e.textContent = text
  return e
}

for (let n = 1; n <= 6; n++) {
  const nets = Array.from({ length: n }, (_, i) => netVariant(i * 2, [1, 1, 1])) // 서로 다른 모양
  const sizes = nets.map((faces) => ({
    x0: Math.min(...faces.map((f) => f.x)),
    y0: Math.min(...faces.map((f) => f.y)),
    w: Math.max(...faces.map((f) => f.x + f.w)) - Math.min(...faces.map((f) => f.x)),
    h: Math.max(...faces.map((f) => f.y + f.h)) - Math.min(...faces.map((f) => f.y)),
  }))
  const slots = pageSlots(PAGE, sizes.map((s) => s.w / s.h))
  const svg = el('svg', { viewBox: '0 0 3 4' })
  slots.forEach((slot, i) => {
    svg.append(el('rect', { x: slot.x, y: slot.y, width: slot.w, height: slot.h, class: 'slot' }))
    const k = slot.w / sizes[i].w
    const g = el('g', { transform: `translate(${slot.x} ${slot.y}) scale(${k}) translate(${-sizes[i].x0} ${-sizes[i].y0})` })
    nets[i].forEach((f) => g.append(el('rect', { x: f.x, y: f.y, width: f.w, height: f.h, class: 'face', 'stroke-width': 0.012 / k })))
    svg.append(g)
    svg.append(el('text', { x: slot.x + 0.03, y: slot.y + 0.16, class: 'num' }, '①②③④⑤⑥'[i]))
  })
  const fig = document.createElement('figure')
  fig.append(svg, Object.assign(document.createElement('figcaption'), { textContent: `${n}개` }))
  out.append(fig)
}
