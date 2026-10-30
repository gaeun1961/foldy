// 면 트리 → three.js 계층 (docs/specs/viewer.md "다면체: 면 트리").
// 면마다 부모와 붙는 모서리 위치에 pivot Group 을 두고, 그 안에 면 메시를 접힌 상태 좌표 그대로 넣는다.
// 그래서 회전각이 0 이면 입체, 모든 pivot 을 (180° − 이면각) 돌리면 전개도가 된다.
import * as THREE from 'three'
import type { Line, PolyhedronPoint } from '../shared/types.ts'
import type { Polyhedron, Vec3 } from './polyhedra.ts'

export interface FaceNode {
  face: number // 면 인덱스 (Polyhedron.faces)
  vertices: number[] // 이 면의 꼭짓점 인덱스 (복사본 매핑 기초, TODO-4~6)
  mesh: THREE.Mesh
  pivot?: THREE.Group // 루트 면은 없음
  axis?: THREE.Vector3 // 회전축 (붙는 모서리 방향)
  unfoldAngle?: number // 다 펼칠 때 회전각 (라디안, 부호 포함) = ±(180° − 이면각)
}

export interface FaceTree {
  root: THREE.Group
  nodes: FaceNode[]
}

const v3 = (p: Vec3) => new THREE.Vector3(...p)

function normalOf(points: THREE.Vector3[]) {
  return new THREE.Vector3().crossVectors(points[1].clone().sub(points[0]), points[2].clone().sub(points[0])).normalize()
}

export function buildFaceTree(
  poly: Polyhedron,
  faceMaterials: [outside: THREE.Material, inside: THREE.Material], // 바깥 면(FrontSide), 안쪽 면(BackSide)
  edgeMaterial: THREE.LineBasicMaterial,
): FaceTree {
  const root = new THREE.Group()
  const inner: THREE.Group[] = [] // 면마다 "접힌 상태 좌표계"인 그룹. 자식 면의 pivot 은 부모의 inner 에 붙는다
  const nodes: FaceNode[] = []

  const add = (f: number) => {
    if (inner[f]) return
    const def = poly.faces[f]
    const points = def.vertices.map((i) => v3(poly.positions[i]))

    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.slice(1, -1).flatMap((p, k) => [points[0], p, points[k + 2]]), // 볼록 다각형 → 부채꼴 삼각형
    )
    geometry.computeVertexNormals()
    // 같은 삼각형을 두 번 그린다: 바깥에서 보면 재질 0, 안쪽에서 보면 재질 1
    geometry.addGroup(0, Infinity, 0)
    geometry.addGroup(0, Infinity, 1)
    const mesh = new THREE.Mesh(geometry, faceMaterials)
    mesh.castShadow = true
    mesh.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), edgeMaterial))
    mesh.userData = { face: f, vertices: def.vertices }
    const node: FaceNode = { face: f, vertices: def.vertices, mesh }

    const group = new THREE.Group()
    group.add(mesh)
    if (def.parent === undefined) {
      root.add(group)
    } else {
      add(def.parent)
      const [a, b] = def.hinge!.map((i) => v3(poly.positions[i]))
      const pivot = new THREE.Group()
      pivot.position.copy(a)
      group.position.copy(a).negate()
      pivot.add(group)
      inner[def.parent].add(pivot)

      // 회전 방향: 다 펼쳤을 때 이 면의 바깥 법선이 부모 면의 바깥 법선과 같아지는 쪽
      const axis = b.clone().sub(a).normalize()
      const angle = THREE.MathUtils.degToRad(180 - def.dihedral!)
      // 두 방향으로 돌려 보고 부모 법선에 더 가까운 쪽 (이면각이 135°보다 크면 반대쪽도 내적이 양수라 "> 0" 으로는 못 가른다)
      const parentNormal = normalOf(poly.faces[def.parent].vertices.map((i) => v3(poly.positions[i])))
      const turned = (a: number) => normalOf(points).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, a)).dot(parentNormal)
      Object.assign(node, { pivot, axis, unfoldAngle: turned(angle) >= turned(-angle) ? angle : -angle })
    }
    inner[f] = group
    nodes.push(node)
  }
  poly.faces.forEach((_, f) => add(f))
  nodes.sort((x, y) => x.face - y.face)
  return { root, nodes }
}

// 펼침 값 s (0 = 입체, 1 = 전개도). 각 pivot 을 s × (180° − 이면각) 회전한다.
// s 가 배열이면 면 인덱스마다 다른 값 (단계별 접기, stepUnfold)
export function applyUnfold(tree: FaceTree, s: number | number[]) {
  for (const n of tree.nodes) n.pivot?.quaternion.setFromAxisAngle(n.axis!, (typeof s === 'number' ? s : s[n.face]) * n.unfoldAngle!)
}

// 단계별 접기: 전체 펼침 값 s 를 면마다의 값으로 나눈다. 접힘 f = 1 − s 를 n 칸으로 나눠
// 순서(order)의 k 번째 면이 k 번째 칸에서 접힌다. 순서에 없는 면(루트)은 s 그대로
export function stepUnfold(order: number[], faceCount: number, s: number) {
  const out = Array<number>(faceCount).fill(s)
  const f = (1 - s) * order.length
  order.forEach((face, k) => (out[face] = 1 - THREE.MathUtils.clamp(f - k, 0, 1)))
  return out
}

// 면 위 선분 (docs/specs/viewer.md "선분"): 선분마다 붙일 면과 끝점 좌표(= 접힌 상태 좌표 = 면 메시 기준 좌표).
// { vertex: v } 는 v 를 가진 면, { edge: [i, j] } 는 i-j 가 그 면의 모서리인 면. 둘 다 맞는 면이 여럿이면 가장 작은 면 인덱스.
// 같은 면 위에 없으면 null (계약 위반, 그리는 쪽에서 경고)
export interface PlacedLine {
  face: number
  from: Vec3
  to: Vec3
}

// 점 p 가 면 face 위에 있는가: { vertex } 는 그 꼭짓점을 가진 면, { edge: [i, j] } 는 i-j 가 그 면의 모서리인 면
function onFaceOf(poly: Polyhedron, p: PolyhedronPoint, face: number) {
  const vs = poly.faces[face].vertices
  if ('vertex' in p) return vs.includes(p.vertex)
  const [a, b] = p.edge.map((i) => vs.indexOf(i))
  return a >= 0 && b >= 0 && (Math.abs(a - b) === 1 || Math.abs(a - b) === vs.length - 1) // 다각형에서 이웃한 두 꼭짓점
}

export function placeLines(poly: Polyhedron, lines: Line<PolyhedronPoint>[]): (PlacedLine | null)[] {
  const point = (p: PolyhedronPoint): Vec3 => {
    if ('vertex' in p) return poly.positions[p.vertex]
    const [a, b] = p.edge.map((i) => poly.positions[i])
    return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * p.t) as Vec3
  }
  return lines.map(({ from, to }) => {
    const face = poly.faces.findIndex((_, f) => onFaceOf(poly, from, f) && onFaceOf(poly, to, f))
    return face < 0 ? null : { face, from: point(from), to: point(to) }
  })
}

// 다른 면의 두 점을 겉면 위 길로 잇기 (viewer.md "선 긋기"): 두 점 사이에 지나갈 면들(이웃한 면 사슬)을 하나의 평면으로
// 펼쳐 두 점을 직선으로 잇는다. 직선이 사슬 안에만 있는 사슬마다 길이 하나씩 나온다. 짧은 순으로 최대 max 개를 돌려주고,
// 첫째가 겉면 최단 경로다 (상자 위 거미와 파리 문제). 나머지는 "다른 길" 후보.
// 길은 지나는 면마다 자른 면별 선분이다. 접으면 겉면을 따라 꺾인 선이 된다. 이을 수 없으면 빈 목록.
// 두 점은 고를 수 있는 점(꼭짓점·모서리 위 점)이라 면의 경계 위에 있고, 잘린 끝점도 모두 면의 경계(모서리) 위다
export function surfaceRoutes(poly: Polyhedron, from: PolyhedronPoint, to: PolyhedronPoint, max = 3): { length: number; lines: Line<PolyhedronPoint>[] }[] {
  const EPS = 1e-6
  const MAX_FACES = 6 // 사슬 길이 한도 (정다면체에서 경우의 수가 너무 많아지지 않게)
  const corners = poly.faces.map((f) => f.vertices.map((v) => v3(poly.positions[v])))
  const normals = corners.map(normalOf)
  const at = (p: PolyhedronPoint) => v3(placeLines(poly, [{ from: p, to: p }])[0]!.from)
  const facesOf = (p: PolyhedronPoint) => poly.faces.flatMap((_, f) => (onFaceOf(poly, p, f) ? [f] : []))
  const shared = (f: number, g: number) => {
    const vs = poly.faces[f].vertices
    for (let k = 0; k < vs.length; k++) {
      const [a, b] = [vs[k], vs[(k + 1) % vs.length]]
      if (onFaceOf(poly, { edge: [a, b], t: 0.5 }, g)) return [a, b]
    }
    return null
  }

  const found: { length: number; lines: Line<PolyhedronPoint>[] }[] = []
  // 사슬 [c0, c1, …] 을 c0 평면으로 펼친다: c_i 는 c_{i-1} 과 붙는 모서리를 축으로 돌려 법선을 맞춘다
  const tryChain = (chain: number[], maps: THREE.Matrix4[]) => {
    const p = at(from)
    const q = at(to).applyMatrix4(maps[maps.length - 1])
    const dir = q.clone().sub(p)
    const length = dir.length()
    const normal = normals[chain[0]]
    // 면마다 직선 p + s·dir 이 펼친 볼록 다각형 안에 있는 구간 (Cyrus–Beck). 사슬 순서대로 0 ~ 1 을 이어 덮어야 한다
    let covered = 0
    const pieces: { face: number; s0: number; s1: number; map: THREE.Matrix4 }[] = []
    for (let i = 0; i < chain.length; i++) {
      const pts = corners[chain[i]].map((c) => c.clone().applyMatrix4(maps[i]))
      let [s0, s1] = [0, 1]
      for (let k = 0; k < pts.length && s0 <= s1; k++) {
        const a = pts[k]
        const inward = normal.clone().cross(pts[(k + 1) % pts.length].clone().sub(a)) // 반시계 다각형의 안쪽
        const num = inward.dot(p.clone().sub(a))
        const den = inward.dot(dir)
        if (Math.abs(den) < EPS) {
          if (num < -EPS) s1 = -1 // 모서리와 나란하고 바깥
        } else if (den > 0) s0 = Math.max(s0, -num / den)
        else s1 = Math.min(s1, -num / den)
      }
      if (s1 - s0 <= EPS || Math.abs(s0 - covered) > 1e-4) return // 이 면을 지나지 않거나 앞 면과 이어지지 않음
      pieces.push({ face: chain[i], s0, s1, map: maps[i] })
      covered = s1
    }
    if (covered < 1 - 1e-4) return

    // 잘린 끝점을 원래(접힌) 좌표로 돌려 그 면의 경계 위 점으로: 꼭짓점이면 { vertex }, 아니면 { edge: [a, b], t }
    const toPoint = (face: number, map: THREE.Matrix4, s: number): PolyhedronPoint => {
      const x = p.clone().addScaledVector(dir, s).applyMatrix4(map.clone().invert())
      const vs = poly.faces[face].vertices
      for (let k = 0; k < vs.length; k++) {
        const [a, b] = [corners[face][k], corners[face][(k + 1) % vs.length]]
        const t = x.clone().sub(a).dot(b.clone().sub(a)) / a.distanceToSquared(b)
        if (t < -EPS || t > 1 + EPS || a.clone().lerp(b, t).distanceTo(x) > 1e-4) continue
        if (t < EPS) return { vertex: vs[k] }
        if (t > 1 - EPS) return { vertex: vs[(k + 1) % vs.length] }
        return { edge: [vs[k], vs[(k + 1) % vs.length]], t }
      }
      throw new Error(`surfaceRoutes: 면 ${face} 의 경계 위 점이 아님`)
    }
    const lines = pieces.map(({ face, s0, s1, map }, i) => ({
      from: i === 0 ? from : toPoint(face, map, s0),
      to: i === pieces.length - 1 ? to : toPoint(face, map, s1),
    }))
    found.push({ length, lines }) // 사슬(면 순서)마다 길 하나라서 서로 다른 길이다
  }

  // 시작 점을 가진 면에서 끝 점을 가진 면까지 이웃한 면을 따라가는 사슬을 모두 해 본다 (같은 면은 두 번 지나지 않음)
  const ends = new Set(facesOf(to))
  const walk = (chain: number[], maps: THREE.Matrix4[]) => {
    const last = chain[chain.length - 1]
    if (chain.length > 1 && ends.has(last)) tryChain(chain, maps)
    if (chain.length >= MAX_FACES) return
    poly.faces.forEach((_, next) => {
      if (chain.includes(next)) return
      const edge = shared(last, next)
      if (!edge) return
      // next 를 붙는 모서리 축으로 돌려 last 와 같은 평면(법선이 같은 쪽)으로 펼친 뒤, last 의 펼침을 이어 적용
      const [a, b] = edge.map((v) => v3(poly.positions[v]))
      const axis = b.clone().sub(a).normalize()
      const angle = Math.atan2(normals[next].clone().cross(normals[last]).dot(axis), normals[next].dot(normals[last]))
      const turn = new THREE.Matrix4()
        .makeTranslation(a.x, a.y, a.z)
        .multiply(new THREE.Matrix4().makeRotationAxis(axis, angle))
        .multiply(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z))
      walk([...chain, next], [...maps, maps[maps.length - 1].clone().multiply(turn)])
    })
  }
  for (const start of facesOf(from)) walk([start], [new THREE.Matrix4()])
  return found.sort((a, b) => a.length - b.length).slice(0, max)
}

// 선이 그어지는 모양: 선분마다 두 끝점(접힌 좌표, 소수 넷째 자리)을 순서 없이 적은 것. 지나는 면·방향이 달라도 모양이 같으면 같다
export function lineShape(poly: Polyhedron, lines: Line<PolyhedronPoint>[]): Set<string> {
  const key = (p: Vec3) => p.map((x) => (Math.round(x * 1e4) / 1e4).toFixed(4)).join(',')
  return new Set(placeLines(poly, lines).flatMap((l) => (l ? [[key(l.from), key(l.to)].sort().join(' ')] : [])))
}

// 길 후보에서 그어지는 모양이 앞의 것과 같은 길을 뺀다 (꼭짓점·모서리를 따라가는 길은 면 순서가 달라도 모양이 같을 수 있다)
export function uniqueRoutes(poly: Polyhedron, routes: Line<PolyhedronPoint>[][]) {
  const seen = new Set<string>()
  return routes.filter((r) => {
    const k = [...lineShape(poly, r)].sort().join('|')
    return !seen.has(k) && !!seen.add(k)
  })
}

// 선 긋기에서 한 면 위에 고를 수 있는 점 (viewer.md "선 긋기"): 꼭짓점 + 모서리 a→b 의 k/n 등분점 (양 끝 제외).
// at 은 접힌 상태 좌표 = 면 메시 기준 좌표
export function facePoints(poly: Polyhedron, face: number, n: number): { point: PolyhedronPoint; at: Vec3 }[] {
  const vs = poly.faces[face].vertices
  const vertices = vs.map((v) => ({ point: { vertex: v } as PolyhedronPoint, at: poly.positions[v] }))
  const divisions = vs.flatMap((a, i) => {
    const b = vs[(i + 1) % vs.length]
    return [...Array(n - 1).keys()].map((k) => {
      const point: PolyhedronPoint = { edge: [a, b], t: (k + 1) / n }
      return { point, at: placeLines(poly, [{ from: point, to: point }])[0]!.from }
    })
  })
  return [...vertices, ...divisions]
}

// 화면에 놓기: 트리 전체를 돌려 루트 면의 바깥 법선이 아래(−y)를 향하고 루트 면이 바닥(y = 0)에 닿게 한다.
// 면 트리 좌표와 applyUnfold 는 그대로라서, 펼치면 전개도가 바닥에 눕고 접으면 면이 위로 일어선다
// yaw: 바닥에 눕힌 뒤 세로축(y)으로 더 돌리는 각도 (라디안, facingYaw)
export function layOnFloor(tree: FaceTree, poly: Polyhedron, yaw = 0) {
  const points = poly.faces.find((f) => f.parent === undefined)!.vertices.map((i) => v3(poly.positions[i]))
  tree.root.quaternion
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    .multiply(new THREE.Quaternion().setFromUnitVectors(normalOf(points), new THREE.Vector3(0, -1, 0)))
  tree.root.position.set(0, -points[0].applyQuaternion(tree.root.quaternion).y, 0)
}

// 접는 순서가 정해지지 않은 도형(정다면체)을 바닥에 눕힐 방향 (viewer.md "단계별 접기"): 펼친 전개도의 가운데가
// 루트 면보다 카메라(toward 의 수평 방향)에서 먼 쪽에 오게 돌리는 각도. 루트 쪽은 카메라 앞 바닥에 남고 먼 쪽이 일어선다
export function facingYaw(tree: FaceTree, poly: Polyhedron, toward: THREE.Vector3) {
  layOnFloor(tree, poly)
  applyUnfold(tree, 1)
  tree.root.updateMatrixWorld(true)
  const centers = tree.nodes.map((n) => new THREE.Box3().setFromObject(n.mesh).getCenter(new THREE.Vector3()))
  const root = centers[poly.faces.findIndex((f) => f.parent === undefined)]
  const v = centers.reduce((s, c) => s.add(c), new THREE.Vector3()).multiplyScalar(1 / centers.length).sub(root)
  if (Math.hypot(v.x, v.z) < 1e-6) return 0 // 루트가 가운데면 그대로
  return Math.atan2(-toward.x, -toward.z) - Math.atan2(v.x, v.z) // y 축으로 θ 돌리면 atan2(x, z) 가 θ 늘어난다
}

// 접는 순서가 정해지지 않은 도형(정다면체)의 단계별 접기 순서 (viewer.md "단계별 접기"): 다 펼쳐 바닥에 눕힌 모양에서
// 카메라 쪽(toward 의 수평 방향)으로 먼 면부터. 먼 쪽이 먼저 일어서야 가까운 면이 접히는 모습을 가리지 않는다. layOnFloor 뒤에 부른다
export function farFirstOrder(tree: FaceTree, toward: THREE.Vector3): number[] {
  const dir = toward.clone().setY(0).normalize()
  applyUnfold(tree, 1)
  tree.root.updateMatrixWorld(true)
  const near = (n: FaceNode) => new THREE.Box3().setFromObject(n.mesh).getCenter(new THREE.Vector3()).dot(dir)
  return tree.nodes
    .filter((n) => n.pivot)
    .map((n) => ({ face: n.face, d: near(n) }))
    .sort((a, b) => a.d - b.d)
    .map((n) => n.face)
}

export function disposeFaceTree(tree: FaceTree) {
  tree.root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose()
  })
}
