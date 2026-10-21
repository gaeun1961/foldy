// 면 트리 → three.js 계층 (docs/specs/viewer.md "다면체: 면 트리").
// 면마다 부모와 붙는 모서리 위치에 pivot Group 을 두고, 그 안에 면 메시를 접힌 상태 좌표 그대로 넣는다.
// 그래서 회전각이 0 이면 입체, 모든 pivot 을 (180° − 이면각) 돌리면 전개도가 된다.
import * as THREE from 'three'
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
  faceMaterial: THREE.Material,
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
    const mesh = new THREE.Mesh(geometry, faceMaterial)
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
// TODO-3: 슬라이더·애니메이션·ViewerProps 연결은 여기서 하지 않는다
export function applyUnfold(tree: FaceTree, s: number) {
  for (const n of tree.nodes) n.pivot?.quaternion.setFromAxisAngle(n.axis!, s * n.unfoldAngle!)
}

export function disposeFaceTree(tree: FaceTree) {
  tree.root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose()
  })
}
