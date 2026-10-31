// 겉넓이 설명(TODO-25)의 면 쌍 찾기. three.js 없이 숫자만 (npm test 로 검사).
// 마주 보는 면 = 바깥 법선이 서로 반대인 두 면. 도형 이름으로 분기하지 않는다 (직육면체는 앞·뒤, 왼·오, 위·아래 3쌍)
import type { Polyhedron, Vec3 } from '../polyhedra.ts'
import { isExact, piValue, slantText, type PiMode } from './lengthLabels.ts'

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}

// 면의 바깥 법선 (꼭짓점이 바깥에서 볼 때 반시계)
export function faceNormal(poly: Polyhedron, face: number): Vec3 {
  const [a, b, c] = poly.faces[face].vertices.map((i) => poly.positions[i])
  return norm(cross(sub(b, a), sub(c, a)))
}

// 면의 넓이 (볼록 다각형을 부채꼴 삼각형으로 나눠 더한다)
export function faceArea(poly: Polyhedron, face: number) {
  const p = poly.faces[face].vertices.map((i) => poly.positions[i])
  let area = 0
  for (let k = 1; k + 1 < p.length; k++) area += Math.hypot(...cross(sub(p[k], p[0]), sub(p[k + 1], p[0]))) / 2
  return area
}

// 같은 모양 면끼리 묶기 (겉넓이 설명): 변 길이를 정렬해 같으면 같은 모양. 직육면체는 3묶음(2장씩), 정육면체는 6장 한 묶음,
// 각기둥은 밑면 2장 + 옆면 n 장, 각뿔은 밑면 1장 + 옆면 n 장. 넓은 묶음부터
export function surfaceGroups(poly: Polyhedron): number[][] {
  const key = (f: number) => {
    const vs = poly.faces[f].vertices
    return vs.map((v, i) => Math.hypot(...sub(poly.positions[v], poly.positions[vs[(i + 1) % vs.length]])).toFixed(6)).sort().join()
  }
  const groups = new Map<string, number[]>()
  poly.faces.forEach((_, f) => groups.set(key(f), [...(groups.get(key(f)) ?? []), f]))
  return [...groups.values()].sort((a, b) => faceArea(poly, b[0]) - faceArea(poly, a[0]))
}

const fmt = (n: number) => String(+n.toFixed(2))
const dist = (a: Vec3, b: Vec3) => Math.hypot(...sub(a, b))
const VIEW: Vec3 = norm([0.3, 1.96, 1]) // 처음 카메라 방향. 넓이 식을 잘 보이는 면에 띄우려고

export interface SurfaceStep {
  faces: number[]
  face: number // 과정을 보여줄 대표 면 (카메라에서 가장 잘 보이는 면)
  count: number // 같은 모양 면 수
  each: number // 한 면 넓이
  exact: boolean // 넓이가 딱 떨어지는가. 아니면 숫자로 계산하지 않는다 (√, ui.md 공식 시각화 규칙)
  text: string // 왼쪽 쪽에 쓸 식: 4 × 3 = 12 cm²
  legs: { from: Vec3; to: Vec3; length: number }[] // 재는 선: 직사각형은 가로·세로, 삼각형은 밑변·높이, 그 밖은 한 변
}
export const polygonWord = (n: number) => (n === 3 ? '삼각형' : n === 4 ? '사각형' : n === 5 ? '오각형' : `${n}각형`)

// 겉넓이 과정 (surfaceArea.ts): 같은 모양 묶음마다 재는 선과 식. 잘 보이는 면 하나로 보여준다. tiles: 1×1 칸 수로 쓴다 (직육면체·정육면체)
export function surfaceSteps(poly: Polyhedron, tiles = false): SurfaceStep[] {
  return surfaceGroups(poly).map((faces) => {
    const face = faces.reduce((best, f) => (dot(faceNormal(poly, f), VIEW) > dot(faceNormal(poly, best), VIEW) ? f : best))
    const p = poly.faces[face].vertices.map((v) => poly.positions[v])
    const each = faceArea(poly, face)
    const exact = isExact(each)
    const leg = (from: Vec3, to: Vec3) => ({ from, to, length: dist(from, to) })
    let legs: SurfaceStep['legs']
    let text: string
    const square = p.length === 4 && Math.abs(dot(sub(p[1], p[0]), sub(p[2], p[1]))) < 1e-6
    if (square) {
      legs = [leg(p[0], p[1]), leg(p[1], p[2])]
      text = tiles ? tileFormula(legs[0].length, legs[1].length, each) : `${fmt(legs[0].length)} × ${fmt(legs[1].length)} = ${fmt(each)} cm²`
    } else if (p.length === 3) {
      // 밑변: 나머지 두 변과 길이가 다른 변 (이등변삼각형), 정삼각형은 아래쪽 변. 높이: 맞은편 꼭짓점에서 내린 수선
      const sides = [0, 1, 2].map((i) => ({ a: p[i], b: p[(i + 1) % 3], c: p[(i + 2) % 3] }))
      const lengths = sides.map((s) => dist(s.a, s.b))
      const odd = sides.findIndex((_, i) => Math.abs(lengths[(i + 1) % 3] - lengths[(i + 2) % 3]) < 1e-6 && Math.abs(lengths[i] - lengths[(i + 1) % 3]) > 1e-6)
      const { a, b, c } = odd >= 0 ? sides[odd] : sides.reduce((low, s) => (s.a[1] + s.b[1] < low.a[1] + low.b[1] ? s : low))
      const u = norm(sub(b, a))
      const t = dot(sub(c, a), u)
      const foot: Vec3 = [a[0] + u[0] * t, a[1] + u[1] * t, a[2] + u[2] * t]
      legs = [leg(a, b), leg(foot, c)]
      text = exact ? `${fmt(legs[0].length)} × ${fmt(legs[1].length)} ÷ 2 = ${fmt(each)} cm²` : `밑변 ${fmt(legs[0].length)} × 높이 ÷ 2`
    } else {
      legs = [leg(p[0], p[1])]
      text = `한 변 ${fmt(legs[0].length)} cm 인 ${polygonWord(p.length)}`
    }
    return { faces, face, count: faces.length, each, exact, text, legs }
  })
}

// 1×1 칸 (직육면체·정육면체 겉넓이): 가로 a, 세로 b 인 면을 왼쪽 아래부터 줄마다 채운다. 정수가 아니면 끝 칸은 그만큼 좁다.
// u, v 는 칸 가운데, su, sv 는 칸 크기
export function tileCells(a: number, b: number) {
  const cells: { u: number; v: number; su: number; sv: number }[] = []
  for (let v = 0; v < b - 1e-9; v += 1)
    for (let u = 0; u < a - 1e-9; u += 1) {
      const [su, sv] = [Math.min(1, a - u), Math.min(1, b - v)]
      cells.push({ u: u + su / 2, v: v + sv / 2, su, sv })
    }
  return cells
}
// 칸을 깐 면의 식: 칸 수가 딱 떨어지면 칸 수로
export const tileFormula = (a: number, b: number, area: number) =>
  Number.isInteger(a) && Number.isInteger(b) ? `가로 ${a}칸 × 세로 ${b}칸 = ${fmt(area)} cm²` : `${fmt(a)} × ${fmt(b)} = ${fmt(area)} cm²`

// 원기둥·원뿔 겉넓이 과정 (curvedSurface.ts): 원기둥은 밑면 → 옆면, 원뿔은 밑면 → 옆면 펼치기 → 큰 원의 비율. each 는 π 의 몇 배, show 로 표기한다
export function curvedSurfaceSteps(shape: 'cylinder' | 'cone', r: number, h: number, mode: PiMode = 'pi'): CountStep[] {
  const show = (n: number) => piValue(n, mode)
  const name = mode === 'pi' ? 'π' : '3.14'
  const base: CountStep = { count: shape === 'cylinder' ? 2 : 1, each: r * r, show, text: `${name} × ${fmt(r)} × ${fmt(r)} = ${show(r * r)} cm²` }
  if (shape === 'cylinder') return [base, { count: 1, each: 2 * r * h, show, text: `가로 ${show(2 * r)} × 높이 ${fmt(h)} = ${show(2 * r * h)} cm²` }]
  const L = Math.hypot(r, h)
  const s = slantText(r, h)
  const value = isExact(L) || mode !== 'pi' ? `${isExact(L) ? '' : '약 '}${show(r * L)}` : `${fmt(r)}${s}π`
  const text = `${name} × 모선 ${s} × 반지름 ${fmt(r)} = ${value} cm²`
  return [
    base,
    { count: 1, each: 0, show, text: '', hint: `옆면을 펼치니 반지름이 모선 ${s} cm 인 부채꼴이 됐어요` },
    { count: 1, each: r * L, show, text, hint: `반지름이 모선인 큰 원에서 ${fmt(r)} ÷ ${s} 만큼이에요. ${text}` },
  ]
}

// 단계 사이 왼쪽 쪽 설명: 4 × 3 = 12 cm². 2장이라 24, 지금까지 24 cm². done 묶음까지 봤을 때
export interface CountStep {
  count: number
  each: number
  text: string
  hint?: string
  exact?: boolean
  show?: (n: number) => string
}
export function surfaceStepHint(steps: CountStep[], done: number) {
  const s = steps[done - 1]
  if (s.hint) return s.hint
  if (s.exact === false) return `${s.text}. 같은 면이 ${s.count}장`
  const show = s.show ?? fmt
  const total = steps.slice(0, done).reduce((sum, t) => sum + t.count * t.each, 0)
  return `${s.text}. ${s.count > 1 ? `${s.count}장이라 ${show(s.count * s.each)}, ` : ''}지금까지 ${show(total)} cm²`
}

// 마주 보는 면 쌍. 면 인덱스가 작은 쪽부터 (직육면체: [앞 0, 뒤 5], [왼 1, 오 2], [위 3, 아래 4])
export function oppositeFacePairs(poly: Polyhedron): [number, number][] {
  const normals = poly.faces.map((_, f) => faceNormal(poly, f))
  const used = new Set<number>()
  const pairs: [number, number][] = []
  normals.forEach((n, f) => {
    if (used.has(f)) return
    const g = normals.findIndex((m, j) => j !== f && !used.has(j) && dot(n, m) < -1 + 1e-6)
    if (g < 0) return
    used.add(f).add(g)
    pairs.push([f, g])
  })
  return pairs
}
