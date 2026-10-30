// 학습지 전개도 grid → 면 트리 데이터 (docs/specs/viewer.md "전개도 grid", shape-scene.md "전개도 grid").
// 펼친 전개도(평면 위 직사각형 면)를 같은 쪽으로 90°씩 접어 접힌 좌표를 구하고, 그 좌표로 Polyhedron 을 만든다.
// 그 뒤로는 다른 다면체와 같다 (faceTree.ts). 잘못 그린 전개도도 그대로 접혀서 겹치거나 빈 곳이 생긴다.
// 라이브러리 독립: three.js 없이 숫자만 쓴다.
import type { GridNet, Line, NetFace, NetPoint, PolyhedronPoint } from '../shared/types.ts'
import type { FaceDef, Polyhedron, Vec3 } from './polyhedra.ts'

const EPS = 1e-6

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// 점 p 를 a 를 지나는 축 u(단위) 둘레로 angle 만큼 돌린다 (로드리게스)
function rotate(p: Vec3, a: Vec3, u: Vec3, angle: number): Vec3 {
  const v = sub(p, a)
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  const uxv = cross(u, v)
  const k = dot(u, v) * (1 - c)
  return [0, 1, 2].map((i) => a[i] + v[i] * c + uxv[i] * s + u[i] * k) as Vec3
}

// 전개도 평면 좌표(x 오른쪽, y 아래) → 펼친 3D 좌표 (z = 0 평면, 위쪽 = +y)
const flat = (p: NetPoint): Vec3 => [p.x, -p.y, 0]

export interface GridPolyhedron extends Polyhedron {
  cornerLabels: { face: number; vertex: number; text: string }[] // 전개도 꼭짓점 라벨을 붙일 (면, 꼭짓점)
  marks: { face: number; text?: string; fill?: boolean }[] // 면 표시
  netLines: Line<PolyhedronPoint>[] // 전개도 위 선을 면마다 자른 면 위 선분
  netFaces: number[] // 면 인덱스 → net.faces 인덱스 (면 표시를 쓸 칸)
}

export function gridPolyhedron(net: GridNet): GridPolyhedron {
  const rects = net.faces
  // 면 꼭짓점: 왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래 (펼쳤을 때 위(+z)에서 보면 시계 방향 = 바깥 법선 −z.
  // 모든 면을 +z 쪽으로 접으므로 접은 뒤 바깥 법선이 입체 바깥을 향한다)
  const corners = rects.map(({ x, y, w, h }) => [flat({ x, y }), flat({ x: x + w, y }), flat({ x: x + w, y: y + h }), flat({ x, y: y + h })])

  // 이웃: 두 면의 변이 같은 직선 위에서 길이가 있게 겹친다. 경첩은 자식 면의 그 변 (꼭짓점 순서 k, k+1)
  const sharedSide = (i: number, j: number) => {
    for (let k = 0; k < 4; k++) {
      const [p, q] = [corners[j][k], corners[j][(k + 1) % 4]]
      for (let m = 0; m < 4; m++) {
        const [r, s] = [corners[i][m], corners[i][(m + 1) % 4]]
        const vertical = Math.abs(p[0] - q[0]) < EPS
        const sameLine = vertical
          ? Math.abs(r[0] - s[0]) < EPS && Math.abs(p[0] - r[0]) < EPS
          : Math.abs(r[1] - s[1]) < EPS && Math.abs(p[1] - r[1]) < EPS
        if (!sameLine) continue
        const axis = vertical ? 1 : 0
        const lo = Math.max(Math.min(p[axis], q[axis]), Math.min(r[axis], s[axis]))
        const hi = Math.min(Math.max(p[axis], q[axis]), Math.max(r[axis], s[axis]))
        if (hi - lo > EPS) return k
      }
    }
    return -1
  }
  const degree = rects.map((_, i) => rects.filter((_, j) => j !== i && sharedSide(i, j) >= 0).length)
  const root = degree.indexOf(Math.max(...degree)) // 이웃이 가장 많은 면

  // 너비 우선 면 트리. 면마다 자기 경첩 회전을 먼저, 그다음 부모의 회전들을 차례로 적용하면 접힌 위치가 된다
  const order = [root]
  const parent = new Map<number, { parent: number; side: number }>()
  const turns = new Map<number, { a: Vec3; u: Vec3; angle: number }[]>([[root, []]])
  for (let n = 0; n < order.length; n++) {
    const i = order[n]
    rects.forEach((_, j) => {
      if (turns.has(j)) return
      const side = sharedSide(i, j)
      if (side < 0) return
      const a = corners[j][side]
      const v = sub(corners[j][(side + 1) % 4], a)
      const u = v.map((c) => c / Math.hypot(...v)) as Vec3
      // 자식 면이 +z 쪽으로 일어서는 방향으로 90°
      const center = corners[j].reduce((sum, p) => sum.map((c, k) => c + p[k] / 4) as Vec3, [0, 0, 0] as Vec3)
      const angle = rotate(center, a, u, Math.PI / 2)[2] > 0 ? Math.PI / 2 : -Math.PI / 2
      turns.set(j, [{ a, u, angle }, ...turns.get(i)!])
      parent.set(j, { parent: i, side })
      order.push(j)
    })
  }
  if (order.length < rects.length) console.warn('foldy: 전개도에서 다른 면과 붙지 않은 면은 접지 않습니다')

  // 접힌 위치. 같은 자리에 온 꼭짓점은 하나로 합친다
  const positions: Vec3[] = []
  const indexOf = (p: Vec3) => {
    const found = positions.findIndex((q) => Math.hypot(...sub(p, q)) < 1e-4)
    if (found >= 0) return found
    positions.push(p)
    return positions.length - 1
  }
  const folded = (face: number, p: Vec3) => turns.get(face)!.reduce((q, t) => rotate(q, t.a, t.u, t.angle), p)
  // 면 번호는 너비 우선 순서로 다시 매긴다 (부모가 먼저). 원래 순서 → 새 번호
  const renumber = new Map(order.map((f, k) => [f, k]))
  const vertexIds = order.map((f) => corners[f].map((p) => indexOf(folded(f, p))))
  const faces: FaceDef[] = order.map((f, k) => {
    const link = parent.get(f)
    if (!link) return { vertices: vertexIds[k] }
    const ids = vertexIds[k]
    return { vertices: ids, parent: renumber.get(link.parent)!, hinge: [ids[link.side], ids[(link.side + 1) % 4]], dihedral: 90 }
  })

  // 전개도 꼭짓점 라벨: 그 점을 꼭짓점으로 가진 첫 면에 붙인다
  const cornerLabels = (net.cornerLabels ?? []).flatMap(({ x, y, text }) => {
    for (let k = 0; k < order.length; k++) {
      const m = corners[order[k]].findIndex((p) => Math.hypot(p[0] - x, p[1] + y) < EPS)
      if (m >= 0) return [{ face: k, vertex: vertexIds[k][m], text }]
    }
    console.warn(`foldy: 전개도 라벨 "${text}" 자리에 면 꼭짓점이 없습니다`)
    return []
  })
  const marks = order.flatMap((f, k) => (rects[f].text || rects[f].fill ? [{ face: k, text: rects[f].text, fill: rects[f].fill }] : []))

  // 전개도 위 선: 면마다(축에 나란한 직사각형) 잘라, 끝점을 그 면의 변 위 점으로 바꾼다
  const onBoundary = (k: number, p: Vec3): PolyhedronPoint | null => {
    const cs = corners[order[k]]
    for (let m = 0; m < 4; m++) {
      const [a, b] = [cs[m], cs[(m + 1) % 4]]
      const ab = sub(b, a)
      const t = dot(sub(p, a), ab) / dot(ab, ab)
      const off = sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t, 0])
      if (t < -EPS || t > 1 + EPS || Math.hypot(...off) > 1e-4) continue
      if (t < EPS) return { vertex: vertexIds[k][m] }
      if (t > 1 - EPS) return { vertex: vertexIds[k][(m + 1) % 4] }
      return { edge: [vertexIds[k][m], vertexIds[k][(m + 1) % 4]], t }
    }
    return null
  }
  const netLines = (net.lines ?? []).flatMap((line) => {
    const [p, q] = [flat(line.from), flat(line.to)]
    const d = sub(q, p)
    const pieces = order.flatMap((f, k) => {
      const { x, y, w, h } = rects[f]
      // 직사각형 [x, x + w] × [−y − h, −y] 안의 구간 (리앙–바스키)
      let [s0, s1] = [0, 1]
      for (const [dir, lo, hi, start] of [
        [d[0], x, x + w, p[0]],
        [d[1], -y - h, -y, p[1]],
      ]) {
        if (Math.abs(dir) < EPS) {
          if (start < lo - EPS || start > hi + EPS) return []
          continue
        }
        const [ta, tb] = [(lo - start) / dir, (hi - start) / dir]
        s0 = Math.max(s0, Math.min(ta, tb))
        s1 = Math.min(s1, Math.max(ta, tb))
      }
      return s1 - s0 > EPS ? [{ k, s0, s1 }] : []
    })
    // 면 경계를 따라가는 선은 두 면에 겹치므로 하나만
    pieces.sort((a, b) => a.s0 - b.s0)
    let covered = -1
    return pieces.flatMap(({ k, s0, s1 }) => {
      if (s1 <= covered + EPS) return []
      covered = s1
      const at = (s: number): Vec3 => [p[0] + d[0] * s, p[1] + d[1] * s, 0]
      const [from, to] = [onBoundary(k, at(s0)), onBoundary(k, at(s1))]
      if (!from || !to) {
        console.warn('foldy: 전개도 위 선의 끝점이 면의 변 위에 없어서 그 조각은 그리지 않습니다', line)
        return []
      }
      return [{ from, to }]
    })
  })

  return { positions, faces, foldOrder: order.slice(1).map((_, k) => k + 1), cornerLabels, marks, netLines, netFaces: order }
}

// 정육면체 전개도 11가지 (viewer.md "전개도 grid" 다른 전개도 모양, TODO-38). # 이 단위 정사각형 칸이다.
// 1-4-1 여섯 가지(첫째가 십자형), 2-3-1 세 가지, 2-2-2, 3-3
export const NET_VARIANTS = [
  ['.#..', '####', '.#..'],
  ['#...', '####', '#...'],
  ['#...', '####', '.#..'],
  ['#...', '####', '..#.'],
  ['#...', '####', '...#'],
  ['.#..', '####', '..#.'],
  ['##..', '.###', '.#..'],
  ['##..', '.###', '..#.'],
  ['##..', '.###', '...#'],
  ['##..', '.##.', '..##'],
  ['###..', '..###'],
].map((rows) => rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [{ x, y }] : []))))

// k번째 모양을 치수 [가로, 세로, 높이] 에 맞춘 grid 면 목록. 칸을 너비 우선으로 따라가며 면의 가로·세로·법선이 입체의
// 어느 방향(0 가로, 1 세로, 2 높이)인지 들고 다닌다. 루트 칸은 십자형 앞면처럼 가로 = 가로, 세로 = 높이, 법선 = 세로.
// 왼쪽·오른쪽으로 넘어가 접으면 면의 가로와 법선이, 위·아래로 넘어가면 세로와 법선이 바뀐다. 면은 부모 옆에 맞닿는 변을 맞춰 놓는다
export function netVariant(k: number, dims: [number, number, number]): NetFace[] {
  const cells = NET_VARIANTS[k]
  const at = (x: number, y: number) => cells.findIndex((c) => c.x === x && c.y === y)
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const degree = cells.map((c) => STEPS.filter(([dx, dy]) => at(c.x + dx, c.y + dy) >= 0).length)
  const root = degree.indexOf(Math.max(...degree))
  const axes = new Map([[root, { u: 0, v: 2, n: 1 }]])
  const rects = new Map<number, NetFace>([[root, { x: 0, y: 0, w: dims[0], h: dims[2] }]])
  const order = [root]
  for (let i = 0; i < order.length; i++) {
    const [c, a, r] = [cells[order[i]], axes.get(order[i])!, rects.get(order[i])!]
    for (const [dx, dy] of STEPS) {
      const j = at(c.x + dx, c.y + dy)
      if (j < 0 || axes.has(j)) continue
      const b = dx ? { u: a.n, v: a.v, n: a.u } : { u: a.u, v: a.n, n: a.v }
      const [w, h] = [dims[b.u], dims[b.v]]
      const x = dx > 0 ? r.x + r.w : dx < 0 ? r.x - w : r.x
      const y = dy > 0 ? r.y + r.h : dy < 0 ? r.y - h : r.y
      axes.set(j, b)
      rects.set(j, { x, y, w, h })
      order.push(j)
    }
  }
  // 칸 순서대로, 왼쪽 위가 (0, 0) 이 되게 옮긴다
  const faces = cells.map((_, i) => rects.get(i)!)
  const [x0, y0] = [Math.min(...faces.map((f) => f.x)), Math.min(...faces.map((f) => f.y))]
  return faces.map((f) => ({ ...f, x: f.x - x0, y: f.y - y0 }))
}
