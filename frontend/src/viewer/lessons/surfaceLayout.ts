// 겉넓이 설명(TODO-25)의 면 쌍 찾기. three.js 없이 숫자만 (npm test 로 검사).
// 마주 보는 면 = 바깥 법선이 서로 반대인 두 면. 도형 이름으로 분기하지 않는다 (직육면체는 앞·뒤, 왼·오, 위·아래 3쌍)
import type { Polyhedron, Vec3 } from '../polyhedra.ts'

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
