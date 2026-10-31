// 피타고라스로 구하는 값의 숫자 쪽 (ui.md 공식 시각화 규칙, 중3 피타고라스 활용). 화면 물체는 regularMeasure.ts, pythagorasStep.ts
// 정다면체: 겉넓이는 면의 높이, 부피는 입체 높이를 구해 √ 를 쓴 식과 답을 만든다. 부피는 정사면체·정팔면체만, 정십이면체 겉넓이는 식만
// 각뿔·원뿔·삼각기둥: 겉넓이 앞에 옆면 높이(모선), 밑면 높이를 구하는 단계 하나 (slantPlan)
import type { ShapeScene } from '../../shared/types.ts'
import { isExact, piValue, slantText, type PiMode } from './lengthLabels.ts'

const FACES: Record<string, number> = { 'regular-tetrahedron': 4, 'regular-octahedron': 8, 'regular-dodecahedron': 12, 'regular-icosahedron': 20 }

const num = (n: number) => String(+n.toFixed(2))
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

// value × √n ÷ den 을 약분해서 쓴다: surd(9, 4, 3) = 9√3/4, surd(4, 4, 3) = √3
export function surd(value: number, den: number, n: number) {
  const scale = 1e6 // 치수는 소수 둘째 자리까지라 세제곱해도 정수가 된다
  const [p, q] = [Math.round(value * scale), den * scale]
  const g = gcd(p, q)
  return `${p === g ? '' : p / g}√${n}${q === g ? '' : `/${q / g}`}`
}

type Result = { formula: string; value?: string }

export interface RegularPlan {
  faces: number
  height: { half: string; height: string } | null // 면 정삼각형의 절반 변과 높이 (정십이면체는 없음)
  areaHints: string[] // 겉넓이 단계마다 왼쪽 쪽 설명. 길이가 단계 수
  areaResult: Result
  volume: { kind: 'tetra' | 'octa'; leg: string; rise: string; hints: string[]; result: Result } | null // 입체 안 직각삼각형: 밑면 가운데까지, 입체 높이
}

export function regularPlan(shape: string, a: number): RegularPlan | null {
  const faces = FACES[shape]
  if (!faces) return null
  if (shape === 'regular-dodecahedron') {
    return { faces, height: null, volume: null, areaHints: ['면이 정오각형이에요. 정오각형 넓이는 피타고라스만으로 구하지 않아서 식으로만 써요', `면 하나 넓이 × 면 개수 = 정오각형 넓이 × ${faces}`], areaResult: { formula: `정오각형 넓이 × ${faces}` } }
  }
  const e = num(a)
  const half = num(a / 2)
  const height = surd(a, 2, 3)
  const one = surd(a * a, 4, 3)
  const total = surd(a * a * faces, 4, 3)
  const base = {
    faces,
    height: { half, height },
    areaHints: [`세 변이 모두 ${e} cm 인 정삼각형이에요. 높이가 있어야 넓이를 구해요`, `높이 = √(${e}² − ${half}²) = ${height} cm. 넓이 = ${e} × ${height} ÷ 2 = ${one} cm²`, `면 하나 넓이 × 면 개수 = ${one} × ${faces} = ${total} cm²`],
    areaResult: { formula: `면 하나 ${one} × ${faces}`, value: `${total} cm²` },
  }
  if (shape === 'regular-tetrahedron') {
    const leg = surd(a, 3, 3)
    const rise = surd(a, 3, 6)
    const hints = [`칠한 면이 밑면이에요. 밑넓이 = ${one} cm²`, `밑면 가운데까지 = 정삼각형 높이 × ⅔ = ${leg} cm. 입체 높이 = √(${e}² − (${leg})²) = ${rise} cm`]
    return { ...base, volume: { kind: 'tetra', leg, rise, hints, result: { formula: `⅓ × ${one} × ${rise}`, value: `${surd(a ** 3, 12, 2)} cm³` } } }
  }
  if (shape === 'regular-octahedron') {
    const leg = surd(a, 2, 2)
    const hints = [`같은 사각뿔 2개예요. 밑면은 한 변이 ${e} cm 인 정사각형이라 밑넓이 = ${num(a * a)} cm²`, `밑면 가운데까지 = 대각선 ÷ 2 = ${leg} cm. 사각뿔 높이 = √(${e}² − (${leg})²) = ${leg} cm`]
    return { ...base, volume: { kind: 'octa', leg, rise: leg, hints, result: { formula: `2 × ⅓ × ${num(a * a)} × ${leg}`, value: `${surd(a ** 3, 3, 2)} cm³` } } }
  }
  return { ...base, volume: null }
}

// 실 감기의 왼쪽 쪽 글과 결과 (thread.ts): 원기둥을 한 바퀴 감은 실은 직각삼각형의 빗변
export function threadPlan(r: number, h: number, mode: PiMode) {
  const around = piValue(2 * r, mode)
  const value = mode === 'pi' ? `√(${num(4 * r * r)}π² + ${num(h * h)}) cm` : `약 ${num(Math.hypot(6.28 * r, h))} cm`
  return {
    hints: ['밑면 앞에서 실을 한 바퀴 감아 바로 위 윗면까지 갔어요', '옆면을 펴니 실이 곧은 선이에요. 곧은 선이 가장 짧은 길이에요', `가로 ${around}, 높이 ${num(h)} 인 직각삼각형의 빗변이에요`],
    label: value,
    result: { general: mode === 'pi' ? '√((2πr)² + h²)' : '√(가로² + 높이²)', formula: `√((${around})² + ${num(h)}²)`, value },
  }
}

export interface SlantPlan {
  hint: string // 왼쪽 쪽 설명
  edge: string // 3D 라벨: 빗변, 밑변 쪽, 높이
  leg: string
  rise: string
}

// 겉넓이 앞에 붙는 피타고라스 단계. 교과서에서 구하지 않는 값이면 null: 정오각형처럼 밑면 가운데까지 거리가 피타고라스로 안 나오거나, 제곱이 딱 떨어지지 않으면 뺀다
export function slantPlan(scene: ShapeScene): SlantPlan | null {
  if (scene.shape === 'cone') {
    const { radius: r, height: h } = scene.size
    const s = slantText(r, h)
    return { hint: `모선 = √(${num(r)}² + ${num(h)}²) = ${s} cm`, edge: `${s} cm`, leg: `${num(r)} cm`, rise: `${num(h)} cm` }
  }
  if (scene.shape === 'prism' && scene.size.sides === 3) {
    const a = scene.size.edge
    const height = surd(a, 2, 3)
    return { hint: `밑면 높이 = √(${num(a)}² − ${num(a / 2)}²) = ${height} cm. 밑넓이 = ${num(a)} × ${height} ÷ 2 = ${surd(a * a, 4, 3)} cm²`, edge: `${num(a)} cm`, leg: `${num(a / 2)} cm`, rise: `${height} cm` }
  }
  if (scene.shape === 'pyramid') {
    const { sides, edge: a, height: h } = scene.size
    // 밑면 가운데에서 변까지 (제곱, 글자)
    const to: Record<number, [number, string]> = { 3: [(a * a) / 12, surd(a, 6, 3)], 4: [(a * a) / 4, num(a / 2)], 6: [(3 * a * a) / 4, surd(a, 2, 3)] }
    if (!to[sides] || !isExact(h * h + to[sides][0])) return null
    const [square, leg] = to[sides]
    const inner = leg.includes('√') ? `(${leg})` : leg
    const s = isExact(Math.sqrt(h * h + square)) ? num(Math.sqrt(h * h + square)) : `√${num(h * h + square)}`
    return { hint: `옆면 높이 = √(${num(h)}² + ${inner}²) = ${s} cm`, edge: `${s} cm`, leg: `${leg} cm`, rise: `${num(h)} cm` }
  }
  return null
}
