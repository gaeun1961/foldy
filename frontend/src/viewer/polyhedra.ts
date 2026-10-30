// 다면체 면 트리 데이터 (docs/specs/viewer.md "다면체: 면 트리").
// 새 다면체는 이 파일에 데이터만 추가한다. 렌더링 코드(faceTree.ts)는 도형 이름으로 분기하지 않는다.
// 라이브러리 독립: three.js 타입 없이 숫자만 쓴다.
import type { BoxSize, EdgeSize, RoundSize, ShapeKind, ShapeScene } from '../shared/types.ts'
import { gridPolyhedron } from './gridNet.ts'

export type Vec3 = [number, number, number]

export interface FaceDef {
  vertices: number[] // 꼭짓점 인덱스, 바깥에서 볼 때 반시계
  parent?: number // 부모 면 인덱스. 없으면 루트(고정)
  hinge?: [number, number] // 부모와 붙는 모서리 (꼭짓점 인덱스 2개)
  dihedral?: number // 그 모서리에서 부모 면과 이루는 이면각 (도)
}

export interface Polyhedron {
  positions: Vec3[] // 꼭짓점 인덱스 → 접힌 상태의 좌표 (three.js: x 가로, y 높이, z 깊이, 앞면 +z)
  faces: FaceDef[]
  foldOrder?: number[] // 단계별 접기 순서 (루트가 아닌 면 인덱스를 한 번씩). 없으면 면 인덱스 순서
}

// 단계별 접기 순서 (docs/specs/viewer.md "단계별 접기")
export const foldOrderOf = (poly: Polyhedron) => poly.foldOrder ?? poly.faces.flatMap((f, i) => (f.parent === undefined ? [] : [i]))

// 접으면 맞닿는 모서리 쌍 (docs/specs/viewer.md "맞닿는 모서리"). 부모와 붙는 모서리(hinge)가 아닌 모서리는
// 전개도에서 잘린 모서리이고, 같은 두 꼭짓점을 가진 잘린 모서리 두 개가 한 쌍이다
export type FaceEdge = [face: number, edge: [number, number]]
export function matchingEdges(poly: Polyhedron): [FaceEdge, FaceEdge][] {
  const key = ([a, b]: number[]) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const hinges = new Set(poly.faces.flatMap((f) => (f.hinge ? [key(f.hinge)] : [])))
  const cut = new Map<string, FaceEdge[]>()
  poly.faces.forEach((f, face) =>
    f.vertices.forEach((a, k) => {
      const edge: [number, number] = [a, f.vertices[(k + 1) % f.vertices.length]]
      if (!hinges.has(key(edge))) cut.set(key(edge), [...(cut.get(key(edge)) ?? []), [face, edge]])
    }),
  )
  // 잘못 그린 전개도(grid)에서는 짝이 없는 모서리가 있다. 짝이 있는 것만
  return [...cut.values()].flatMap((pair) => (pair.length === 2 ? [[pair[0], pair[1]] as [FaceEdge, FaceEdge]] : []))
}

// 직육면체·정육면체 (docs/specs/shape-scene.md 꼭짓점 규칙, viewer.md 면 트리 표)
function boxPositions(w: number, d: number, h: number): Vec3[] {
  return [...Array(8).keys()].map((i) => [
    [1, 2, 5, 6].includes(i) ? w / 2 : -w / 2,
    i >= 4 ? h / 2 : -h / 2,
    [0, 1, 4, 5].includes(i) ? d / 2 : -d / 2,
  ])
}
const BOX_FACES: FaceDef[] = [
  { vertices: [0, 1, 5, 4] }, // 0 앞면 (루트)
  { vertices: [0, 4, 7, 3], parent: 0, hinge: [0, 4], dihedral: 90 }, // 1 왼쪽
  { vertices: [1, 2, 6, 5], parent: 0, hinge: [1, 5], dihedral: 90 }, // 2 오른쪽
  { vertices: [4, 5, 6, 7], parent: 0, hinge: [4, 5], dihedral: 90 }, // 3 윗면
  { vertices: [0, 3, 2, 1], parent: 0, hinge: [0, 1], dihedral: 90 }, // 4 아랫면
  { vertices: [3, 7, 6, 2], parent: 2, hinge: [2, 6], dihedral: 90 }, // 5 뒷면 (오른쪽에 붙음)
]
// 왼쪽 → 뒷면 → 오른쪽 → 윗면 → 아랫면. 뒷면이 먼저 오른쪽 면 끝에서 일어서고, 오른쪽 면이 접히며 뒷면을 덮개로 얹는다
const BOX_FOLD_ORDER = [1, 5, 2, 3, 4]

// 정다면체 (TODO-16, docs/specs/shape-scene.md 꼭짓점 규칙). 가운데가 원점. 방향 φ 는 앞(+z) 0°, 오른쪽(+x) 90°
const ring = (r: number, y: number, deg: number): Vec3 => [r * Math.sin((deg * Math.PI) / 180), y, r * Math.cos((deg * Math.PI) / 180)]
const PHI = (1 + Math.sqrt(5)) / 2

// 면 하나: 꼭짓점 집합을 바깥에서 볼 때 반시계로 (가운데가 원점인 볼록 입체라 바깥 = 면 중심 쪽)
function ccw(positions: Vec3[], set: number[]): number[] {
  const pts = set.map((i) => positions[i])
  const c = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length)
  const n = Math.hypot(...c)
  const out = c.map((x) => x / n)
  // 면 평면 위 두 축 u, v (u × v = 바깥 법선)
  const a = pts[0].map((x, k) => x - c[k])
  const la = Math.hypot(...a)
  const u = a.map((x) => x / la)
  const v = [out[1] * u[2] - out[2] * u[1], out[2] * u[0] - out[0] * u[2], out[0] * u[1] - out[1] * u[0]]
  const angle = (p: Vec3) => {
    const d = p.map((x, k) => x - c[k])
    return Math.atan2(d[0] * v[0] + d[1] * v[1] + d[2] * v[2], d[0] * u[0] + d[1] * u[1] + d[2] * u[2])
  }
  return [...set].sort((i, j) => angle(positions[i]) - angle(positions[j]))
}

// 면 트리: [꼭짓점 집합, 부모 면 번호, 붙는 모서리]. 모든 면의 이면각이 같다
type TreeRow = [set: number[], parent?: number, hinge?: [number, number]]
function regular(positions: Vec3[], rows: TreeRow[], dihedral: number): Polyhedron {
  return { positions, faces: rows.map(([set, parent, hinge]) => ({ vertices: ccw(positions, set), ...(parent !== undefined && { parent, hinge, dihedral }) })) }
}
const deg = (rad: number) => (rad * 180) / Math.PI

// 정사면체: 밑면(0 앞왼쪽, 1 앞오른쪽, 2 뒤) + 3 꼭대기. 전개도: 밑면 둘레에 옆면 셋 (큰 정삼각형)
function tetrahedron(a: number): Polyhedron {
  const H = a * Math.sqrt(2 / 3)
  const R = a / Math.sqrt(3)
  const positions: Vec3[] = [ring(R, -H / 4, -60), ring(R, -H / 4, 60), ring(R, -H / 4, 180), [0, (3 * H) / 4, 0]]
  return regular(positions, [[[0, 1, 2]], [[0, 1, 3], 0, [0, 1]], [[1, 2, 3], 0, [1, 2]], [[2, 0, 3], 0, [2, 0]]], deg(Math.acos(1 / 3)))
}

// 정팔면체: 0 꼭대기, 1~4 가운데(앞·오른쪽·뒤·왼쪽), 5 바닥. 전개도: 꼭대기 둘레 윗면 넷을 부채꼴로, 아랫면은 각 윗면 바깥에 하나씩
function octahedron(a: number): Polyhedron {
  const r = a / Math.SQRT2
  const positions: Vec3[] = [[0, r, 0], ring(r, 0, 0), ring(r, 0, 90), ring(r, 0, 180), ring(r, 0, 270), [0, -r, 0]]
  const next = (i: number) => (i % 4) + 1
  const rows: TreeRow[] = [1, 2, 3, 4].map((i): TreeRow => [[0, i, next(i)], i === 1 ? undefined : i - 2, i === 1 ? undefined : [0, i]])
  for (const i of [1, 2, 3, 4]) rows.push([[5, i, next(i)], i - 1, [i, next(i)]])
  return regular(positions, rows, deg(Math.acos(-1 / 3)))
}

// 정이십면체: 0 꼭대기, 1~5 위 고리(1이 앞), 6~10 아래 고리(36° 더 돈 자리부터), 11 바닥.
// 전개도(교과서 모양): 가운데 띠 삼각형 10개를 한 줄로, 위 뚜껑 5개는 띠 위쪽, 아래 뚜껑 5개는 띠 아래쪽
function icosahedron(a: number): Polyhedron {
  const r = a / (2 * Math.sin(Math.PI / 5)) // 고리 반지름
  const Rc = a * Math.sin((2 * Math.PI) / 5) // 꼭대기까지
  const h = Rc - Math.sqrt(a * a - r * r) // 고리 높이
  const up = (i: number) => ((i - 1) % 5) + 1 // 1~5 돌려 쓰기
  const positions: Vec3[] = [[0, Rc, 0], ...[0, 1, 2, 3, 4].map((k) => ring(r, h, 72 * k)), ...[0, 1, 2, 3, 4].map((k) => ring(r, -h, 36 + 72 * k)), [0, -Rc, 0]]
  // 띠: A_i = {i, i+1, 5+i} (위 고리 두 점 + 아래 한 점), L_i = {5+i, 5+i+1, i+1}. 띠 순서 A1 L1 A2 L2 … A5 L5, 가운데 A3 가 루트
  const A = (i: number) => [i, up(i + 1), 5 + i]
  const L = (i: number) => [5 + i, 5 + up(i + 1), up(i + 1)]
  const band: number[][] = [A(1), L(1), A(2), L(2), A(3), L(3), A(4), L(4), A(5), L(5)]
  const ROOT = 4
  const shared = (x: number[], y: number[]) => x.filter((v) => y.includes(v)) as [number, number]
  const rows: TreeRow[] = band.map((set, k): TreeRow => {
    if (k === ROOT) return [set]
    const parent = k < ROOT ? k + 1 : k - 1
    return [set, parent, shared(set, band[parent])]
  })
  // 뚜껑: 위 U_i = {0, i, i+1} 는 A_i(띠 2(i−1)번)에, 아래 D_i = {11, 5+i, 5+i+1} 은 L_i(띠 2(i−1)+1번)에
  for (let i = 1; i <= 5; i++) rows.push([[0, i, up(i + 1)], 2 * (i - 1), [i, up(i + 1)]])
  for (let i = 1; i <= 5; i++) rows.push([[11, 5 + i, 5 + up(i + 1)], 2 * (i - 1) + 1, [5 + i, 5 + up(i + 1)]])
  return regular(positions, rows, deg(Math.acos(-Math.sqrt(5) / 3)))
}

// 정십이면체: 윗면이 수평. 0~4 윗면(0 앞), 5~9 위 고리(0~4 바로 아래), 10~14 아래 고리(36° 더 돈 자리부터), 15~19 아랫면.
// 전개도(교과서 모양): 윗면 꽃(윗면 + 둘레 다섯 면)과 아랫면 꽃을 꽃잎 하나로 잇는다
function dodecahedron(a: number): Polyhedron {
  const rho = a / (2 * Math.sin(Math.PI / 5)) // 윗면 오각형 반지름
  const R2 = rho * PHI // 고리 반지름
  const Rc = (a * Math.sqrt(3) * PHI) / 2 // 꼭짓점까지
  const y2 = Math.sqrt(Rc * Rc - R2 * R2)
  const y1 = Math.sqrt(Rc * Rc - rho * rho)
  const k5 = [0, 1, 2, 3, 4]
  const positions: Vec3[] = [
    ...k5.map((k) => ring(rho, y1, 72 * k)),
    ...k5.map((k) => ring(R2, y2, 72 * k)),
    ...k5.map((k) => ring(R2, -y2, 36 + 72 * k)),
    ...k5.map((k) => ring(rho, -y1, 36 + 72 * k)),
  ]
  const n = (i: number) => (i + 1) % 5
  // 면 0 윗면(루트), 1~5 윗면 꽃잎 U_i = {i, i+1, 5+i, 5+i+1, 10+i}, 6 아랫면(L_0 에 붙음), 7~11 아랫면 꽃잎 L_i = {10+i, 10+i+1, 15+i, 15+i+1, 5+i+1}
  const rows: TreeRow[] = [[k5]]
  for (const i of k5) rows.push([[i, n(i), 5 + i, 5 + n(i), 10 + i], 0, [i, n(i)]])
  rows.push([k5.map((k) => 15 + k), 7, [15, 16]]) // 아랫면은 L_0(면 7)에 붙는다
  for (const i of k5) rows.push(i === 0 ? [[10, 11, 15, 16, 6], 1, [6, 10]] : [[10 + i, 10 + n(i), 15 + i, 15 + n(i), 5 + n(i)], 6, [15 + i, 15 + n(i)]])
  return regular(positions, rows, deg(Math.acos(-1 / Math.sqrt(5))))
}

type SizeOf<S extends ShapeKind> = S extends 'cuboid' ? BoxSize : S extends 'cylinder' | 'cone' ? RoundSize : EdgeSize

const POLYHEDRA: { [S in ShapeKind]?: (size: SizeOf<S>) => Polyhedron } = {
  cuboid: ({ width, depth, height }) => ({ positions: boxPositions(width, depth, height), faces: BOX_FACES, foldOrder: BOX_FOLD_ORDER }),
  cube: ({ edge }) => ({ positions: boxPositions(edge, edge, edge), faces: BOX_FACES, foldOrder: BOX_FOLD_ORDER }),
  'regular-tetrahedron': ({ edge }) => tetrahedron(edge),
  'regular-octahedron': ({ edge }) => octahedron(edge),
  'regular-dodecahedron': ({ edge }) => dodecahedron(edge),
  'regular-icosahedron': ({ edge }) => icosahedron(edge),
}

// 면 트리로 그릴 수 있는 도형이면 데이터를, 아니면(곡면 도형, 아직 없는 도형) null.
// 학습지 전개도(net.layout = "grid")는 그 전개도를 접어서 만든다 (gridNet.ts)
export function polyhedronOf(scene: ShapeScene): Polyhedron | null {
  if (scene.net.layout === 'grid') return gridPolyhedron(scene.net)
  const make = POLYHEDRA[scene.shape] as ((size: ShapeScene['size']) => Polyhedron) | undefined
  return make ? make(scene.size) : null
}

// 단계별 접기의 단계 수. 면 트리가 없는 도형은 0
export function foldStepCount(scene: ShapeScene) {
  const poly = polyhedronOf(scene)
  return poly ? foldOrderOf(poly).length : 0
}

// 바른 전개도인지 (viewer.md "전개도 grid"): 다 접었을 때 같은 자리에 겹친 면이 없고, 모든 모서리가 두 면에 하나씩 맞닿으면 닫힌 입체다.
// overlapFaces 는 같은 자리·같은 방향에 겹친 면들. 면 트리가 없는 도형은 null
// 다 접었을 때 face 와 마주 보는 면 (viewer.md onFacePick): 평행하고 같은 평면이 아닌 면.
// 바른 직육면체·정육면체는 하나, 잘못된 전개도는 없거나(그 자리가 빔) 여럿(두 면이 겹침)일 수 있다
export function oppositeFaces(poly: Polyhedron, face: number): number[] {
  const plane = (i: number) => {
    const [a, b, c] = poly.faces[i].vertices.slice(0, 3).map((v) => poly.positions[v])
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(n[0], n[1], n[2])
    return { n: n.map((x) => x / len), a }
  }
  const p = plane(face)
  const dot = (x: number[], y: number[]) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2]
  return poly.faces.flatMap((_, i) => {
    if (i === face) return []
    const q = plane(i)
    const gap = dot(p.n, [q.a[0] - p.a[0], q.a[1] - p.a[1], q.a[2] - p.a[2]])
    return Math.abs(dot(p.n, q.n)) > 1 - 1e-6 && Math.abs(gap) > 1e-6 ? [i] : []
  })
}

export function netCheck(scene: ShapeScene): { closed: boolean; overlapFaces: number[] } | null {
  const poly = polyhedronOf(scene)
  if (!poly) return null
  const centers = poly.faces.map((f) => [0, 1, 2].map((k) => f.vertices.reduce((sum, v) => sum + poly.positions[v][k], 0) / f.vertices.length))
  const overlapFaces = centers.flatMap((c, i) => (centers.some((d, j) => j !== i && Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) < 1e-4) ? [i] : []))
  const count = new Map<string, number>()
  for (const f of poly.faces)
    f.vertices.forEach((a, k) => {
      const b = f.vertices[(k + 1) % f.vertices.length]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      count.set(key, (count.get(key) ?? 0) + 1)
    })
  return { closed: overlapFaces.length === 0 && [...count.values()].every((n) => n === 2), overlapFaces }
}
