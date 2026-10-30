// 위치 관계 설명(TODO-28)의 계산 쪽: 모서리 목록, 기준 모서리와 다른 모서리의 관계(평행·만남·꼬인 위치). 화면 물체는 만들지 않는다.
// 도형 이름으로 분기하지 않고 좌표로 가른다: 방향이 나란하면 평행, 같은 평면 위면(나란하지 않고) 만남, 아니면 꼬인 위치
import type { Polyhedron, Vec3 } from '../polyhedra.ts'

// 위치 관계 색. 화면 색 설명(ui.md)과 3D 가 같이 쓴다
export const RELATION_COLORS = { ref: '#e03131', kinds: ['#2f9e44', '#f08c00', '#7048e8'] } // 기준, [평행, 만남, 꼬인 위치]

export type Edge = [number, number]

const EPS = 1e-9
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a: Vec3) => Math.sqrt(dot(a, a))

// 면 다각형의 이웃한 두 꼭짓점 = 모서리. 두 면이 나눠 가지므로 한 번씩만 (작은 인덱스 먼저, 정렬)
export function edgesOf(poly: Polyhedron): Edge[] {
  const keys = new Set<string>()
  for (const { vertices: vs } of poly.faces)
    vs.forEach((v, i) => {
      const w = vs[(i + 1) % vs.length]
      keys.add(v < w ? `${v}-${w}` : `${w}-${v}`)
    })
  return [...keys].map((k) => k.split('-').map(Number) as Edge).sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

// 처음 기준 모서리: 루트 면(직육면체는 앞면)의 첫 모서리. 학생이 다른 모서리를 누르면 바뀐다
export function defaultEdge(poly: Polyhedron): Edge {
  const root = poly.faces.find((f) => f.parent === undefined) ?? poly.faces[0]
  const [a, b] = root.vertices
  return a < b ? [a, b] : [b, a]
}

export const sameEdge = (a: Edge, b: Edge) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0])

// 기준 모서리와 나머지 모서리의 관계. 만남은 두 직선이 한 점에서 만나는 것이고, perpendicular 는 그중 수직인 것
export function edgeRelations(poly: Polyhedron, ref: Edge) {
  const p = poly.positions
  const u = sub(p[ref[1]], p[ref[0]])
  const parallel: Edge[] = []
  const meet: Edge[] = []
  const skew: Edge[] = []
  for (const e of edgesOf(poly)) {
    if (sameEdge(e, ref)) continue
    const v = sub(p[e[1]], p[e[0]])
    const n = cross(u, v)
    if (len(n) < EPS * len(u) * len(v) + EPS) parallel.push(e)
    else if (Math.abs(dot(sub(p[e[0]], p[ref[0]]), n)) < EPS * len(n) * (len(u) + len(v)) + EPS) meet.push(e)
    else skew.push(e)
  }
  const perpendicular = meet.filter((e) => Math.abs(dot(u, sub(p[e[1]], p[e[0]]))) < EPS)
  return { parallel, meet, skew, perpendicular }
}

// 두 모서리(직선)가 만나는 점. 만나는 모서리만 부른다
export function meetPoint(poly: Polyhedron, a: Edge, b: Edge): Vec3 {
  const p = poly.positions
  const shared = a.find((v) => b.includes(v))
  if (shared !== undefined) return p[shared]
  // 꼭짓점을 나누지 않으면 두 직선의 교점: a0 + s u = b0 + t v 에서 s = ((b0 − a0) × v)·(u × v) / |u × v|²
  const u = sub(p[a[1]], p[a[0]])
  const v = sub(p[b[1]], p[b[0]])
  const n = cross(u, v)
  const s = dot(cross(sub(p[b[0]], p[a[0]]), v), n) / dot(n, n)
  return [p[a[0]][0] + u[0] * s, p[a[0]][1] + u[1] * s, p[a[0]][2] + u[2] * s]
}
