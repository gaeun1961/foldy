// 모서리 길이 글자의 내용과 자리 (docs/specs/viewer.md "모서리 길이 표시"). three.js 없이 숫자만 (npm test 로 검사)
import type { BoxSize } from '../../shared/types.ts'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'

export interface LengthLabel {
  text: string
  at: Vec3
}

// 원이 들어간 값의 표기 (ui.md 공식 시각화 규칙): 기본은 π 를 그대로 둔다(48π), 초등은 3.14 로 계산한다
export type PiMode = 'pi' | '3.14'
const short = (n: number) => +n.toFixed(2)
export const piValue = (coef: number, mode: PiMode) => (mode === 'pi' ? `${coef === 1 ? '' : short(coef)}π` : String(short(coef * 3.14)))
// 소수 둘째 자리까지 딱 떨어지는 값인가. 아니면 숫자로 계산하지 않는다 (√)
export const isExact = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6
// 모선: 딱 떨어지지 않으면 √ 그대로
export const slantText = (r: number, h: number) => (isExact(Math.hypot(r, h)) ? String(short(Math.hypot(r, h))) : `√${short(r * r + h * h)}`)

export const lengthText = (n: number) => `${+n.toFixed(2)} cm`
// 계산해서 나온 길이: 딱 떨어지면 그대로, 아니면 약 (대각선)
export const computedLengthText = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? lengthText(Math.round(n)) : `약 ${lengthText(n)}`)

// 입체 (가운데가 원점인 상자): 앞 아래 = 가로, 오른쪽 아래 = 세로, 앞 왼쪽 = 높이. 모서리에서 gap 만큼 바깥에
export function boxLengthLabels({ width: w, depth: d, height: h }: BoxSize): LengthLabel[] {
  const gap = Math.max(w, d, h) * 0.08
  return [
    { text: lengthText(w), at: [0, -h / 2 - gap, d / 2 + gap] },
    { text: lengthText(d), at: [w / 2 + gap, -h / 2 - gap, 0] },
    { text: lengthText(h), at: [-w / 2 - gap, 0, d / 2 + gap] }, // 앞 왼쪽: 위에서 내려다보면 오른쪽 아래 글자와 겹치지 않는다
  ]
}

// 상자가 아닌 입체: 길이가 다른 모서리마다 하나씩, 가장 앞쪽 모서리 바깥에 (각기둥은 밑면 변·높이, 각뿔은 밑면 변·옆 모서리)
export function solidLengthLabels(poly: Polyhedron): LengthLabel[] {
  const center = [0, 1, 2].map((k) => poly.positions.reduce((s, p) => s + p[k], 0) / poly.positions.length)
  const best = new Map<string, { a: Vec3; b: Vec3; len: number }>()
  for (const f of poly.faces)
    f.vertices.forEach((v, i) => {
      const [a, b] = [poly.positions[v], poly.positions[f.vertices[(i + 1) % f.vertices.length]]]
      const len = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      const key = len.toFixed(4)
      const seen = best.get(key)
      if (!seen || a[2] + b[2] > seen.a[2] + seen.b[2]) best.set(key, { a, b, len })
    })
  return [...best.values()].filter(({ len }) => isExact(len)).map(({ a, b, len }) => {
    const mid = [0, 1, 2].map((k) => (a[k] + b[k]) / 2)
    return { text: lengthText(len), at: mid.map((m, k) => m + (m - center[k]) * 0.18) as Vec3 }
  })
}

// 전개도: 면마다 이웃한 두 변의 길이를 변 안쪽에. 좌표는 면 메시 기준(접힌 좌표)이라 면에 붙이면 접힘을 따라간다
export function faceLengthLabels(poly: Polyhedron, face: number): LengthLabel[] {
  const pts = poly.faces[face].vertices.map((v) => poly.positions[v])
  const center = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length)
  return [0, 1].map((k) => {
    const [a, b] = [pts[k], pts[k + 1]]
    const mid = [0, 1, 2].map((i) => (a[i] + b[i]) / 2)
    return { text: lengthText(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])), at: mid.map((m, i) => m + (center[i] - m) * 0.3) as Vec3 }
  })
}
