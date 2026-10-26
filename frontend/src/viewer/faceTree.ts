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
      const parentNormal = normalOf(poly.faces[def.parent].vertices.map((i) => v3(poly.positions[i])))
      const turned = normalOf(points).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, angle))
      Object.assign(node, { pivot, axis, unfoldAngle: turned.dot(parentNormal) > 0 ? angle : -angle })
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

export function placeLines(poly: Polyhedron, lines: Line<PolyhedronPoint>[]): (PlacedLine | null)[] {
  const onFace = (p: PolyhedronPoint, vs: number[]) => {
    if ('vertex' in p) return vs.includes(p.vertex)
    const [a, b] = p.edge.map((i) => vs.indexOf(i))
    return a >= 0 && b >= 0 && (Math.abs(a - b) === 1 || Math.abs(a - b) === vs.length - 1) // 다각형에서 이웃한 두 꼭짓점
  }
  const point = (p: PolyhedronPoint): Vec3 => {
    if ('vertex' in p) return poly.positions[p.vertex]
    const [a, b] = p.edge.map((i) => poly.positions[i])
    return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * p.t) as Vec3
  }
  return lines.map(({ from, to }) => {
    const face = poly.faces.findIndex((f) => onFace(from, f.vertices) && onFace(to, f.vertices))
    return face < 0 ? null : { face, from: point(from), to: point(to) }
  })
}

// 화면에 놓기: 트리 전체를 돌려 루트 면의 바깥 법선이 아래(−y)를 향하고 루트 면이 바닥(y = 0)에 닿게 한다.
// 면 트리 좌표와 applyUnfold 는 그대로라서, 펼치면 전개도가 바닥에 눕고 접으면 면이 위로 일어선다
export function layOnFloor(tree: FaceTree, poly: Polyhedron) {
  const points = poly.faces.find((f) => f.parent === undefined)!.vertices.map((i) => v3(poly.positions[i]))
  tree.root.quaternion.setFromUnitVectors(normalOf(points), new THREE.Vector3(0, -1, 0))
  tree.root.position.set(0, -points[0].applyQuaternion(tree.root.quaternion).y, 0)
}

export function disposeFaceTree(tree: FaceTree) {
  tree.root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose()
  })
}
