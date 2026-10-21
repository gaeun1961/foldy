// 면 트리 검사: 접힌 상태(s = 0)는 원래 입체, 다 펼친 상태(s = 1)는 viewer.md 의 cross 배치인지 확인.
// 실행: frontend 폴더에서 `npm test` (= node src/viewer/faceTree.test.ts)
import * as THREE from 'three'
import { applyUnfold, buildFaceTree, layOnFloor, stepUnfold } from './faceTree.ts'
import { foldOrderOf, foldStepCount, polyhedronOf, type Polyhedron } from './polyhedra.ts'
import type { ShapeScene } from '../shared/types.ts'

const EPS = 1e-9
const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}

function worldPoints(mesh: THREE.Mesh) {
  const pos = mesh.geometry.getAttribute('position')
  return [...Array(pos.count).keys()].map((k) => new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld))
}

function checkBox(scene: ShapeScene, w: number, d: number, h: number) {
  const poly = polyhedronOf(scene)!
  const tree = buildFaceTree(poly, [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()], new THREE.LineBasicMaterial())

  // s = 0: 모든 면이 원래 좌표 그대로
  applyUnfold(tree, 0)
  tree.root.updateMatrixWorld(true)
  for (const n of tree.nodes) {
    const expected = n.vertices.map((i) => new THREE.Vector3(...poly.positions[i]))
    const actual = worldPoints(n.mesh)
    check(actual.every((p) => expected.some((e) => e.distanceTo(p) < EPS)), `${scene.shape} 면 ${n.face}: 접힌 좌표가 다름`)
  }

  // s = 1: 모두 앞면 평면(z = d/2)에 놓이고, 면마다 cross 배치의 칸에 들어간다
  applyUnfold(tree, 1)
  tree.root.updateMatrixWorld(true)
  const [x0, x1, y0, y1] = [-w / 2, w / 2, -h / 2, h / 2]
  // 면 인덱스: 0 앞, 1 왼, 2 오, 3 위, 4 아래, 5 뒤.  [xmin, xmax, ymin, ymax]
  const cells: Record<number, number[]> = {
    0: [x0, x1, y0, y1],
    1: [x0 - d, x0, y0, y1],
    2: [x1, x1 + d, y0, y1],
    5: [x1 + d, x1 + d + w, y0, y1],
    3: [x0, x1, y1, y1 + d],
    4: [x0, x1, y0 - d, y0],
  }
  for (const n of tree.nodes) {
    const pts = worldPoints(n.mesh)
    check(pts.every((p) => Math.abs(p.z - d / 2) < EPS), `${scene.shape} 면 ${n.face}: 앞면 평면에 없음`)
    const box = [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.y))]
    check(box.every((v, k) => Math.abs(v - cells[n.face][k]) < EPS), `${scene.shape} 면 ${n.face}: cross 칸이 아님 ${box.map((v) => v.toFixed(2))}`)
    // 펼쳐도 바깥 면이 보는 사람 쪽(+z)을 향한다 (안쪽이 보이면 뒤집힌 것)
    const normal = new THREE.Vector3().crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0])).normalize()
    check(normal.z > 1 - EPS, `${scene.shape} 면 ${n.face}: 펼친 면이 뒤집힘`)
  }

  // 바닥에 눕히기: s = 1 이면 모든 면이 y = 0 에 바깥 면을 아래로, s = 0 이면 루트 면만 바닥에 닿고 나머지는 위로
  layOnFloor(tree, poly)
  tree.root.updateMatrixWorld(true)
  for (const n of tree.nodes) {
    const pts = worldPoints(n.mesh)
    check(pts.every((p) => Math.abs(p.y) < EPS), `${scene.shape} 면 ${n.face}: 펼친 면이 바닥에 없음`)
    const normal = new THREE.Vector3().crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0])).normalize()
    check(normal.y < -1 + EPS, `${scene.shape} 면 ${n.face}: 바닥에 눕힌 면의 바깥이 아래가 아님`)
  }
  applyUnfold(tree, 0)
  tree.root.updateMatrixWorld(true)
  const ys = tree.nodes.flatMap((n) => worldPoints(n.mesh).map((p) => p.y))
  check(Math.min(...ys) > -EPS && Math.abs(Math.max(...ys) - d) < EPS, `${scene.shape}: 접은 상자가 바닥 위에 서 있지 않음`)

  checkStepFold(scene, poly, tree)
}

// 단계별 접기 (viewer.md "단계별 접기")
function checkStepFold(scene: ShapeScene, poly: Polyhedron, tree: ReturnType<typeof buildFaceTree>) {
  const order = foldOrderOf(poly)
  const nonRoot = poly.faces.flatMap((f, i) => (f.parent === undefined ? [] : [i]))
  check(order.length === nonRoot.length && nonRoot.every((i) => order.includes(i)), `${scene.shape}: foldOrder 가 루트 아닌 면을 한 번씩 담지 않음`)
  // 자식 면이 부모보다 먼저 접힐 수 있다 (직육면체: 뒷면이 오른쪽 면보다 먼저). 그 면과 조상이 모두 접혔을 때만 입체 좌표에 온다
  const chain = (f: number): number[] => (poly.faces[f].parent === undefined ? [] : [f, ...chain(poly.faces[f].parent!)])

  const n = order.length
  const count = poly.faces.length
  check(stepUnfold(order, count, 1).every((v) => v === 1) && stepUnfold(order, count, 0).every((v) => v === 0), `${scene.shape}: 단계별 끝값`)
  const mid = stepUnfold(order, count, 1 - 1.5 / n) // 첫 면 다 접힘, 둘째 면 반, 나머지 펼침
  check(Math.abs(mid[order[0]]) < EPS && Math.abs(mid[order[1]] - 0.5) < EPS && order.slice(2).every((f) => mid[f] === 1), `${scene.shape}: 단계 중간값 ${mid}`)

  // 단계 경계 k 마다: 순서상 앞의 k 개 면은 펼침 값 0, 나머지는 1. 자기와 조상이 모두 접힌 면은 입체 좌표, k = n 이면 모든 면
  for (let k = 0; k <= n; k++) {
    const values = stepUnfold(order, count, 1 - k / n)
    check(order.every((f, j) => Math.abs(values[f] - (j < k ? 0 : 1)) < EPS), `${scene.shape}: ${k}단계 값 ${values}`)
    tree.root.position.set(0, 0, 0)
    tree.root.quaternion.identity()
    applyUnfold(tree, values)
    tree.root.updateMatrixWorld(true)
    const folded = order.slice(0, k)
    for (const face of folded.filter((f) => chain(f).every((a) => folded.includes(a)))) {
      const node = tree.nodes[face]
      const expected = node.vertices.map((i) => new THREE.Vector3(...poly.positions[i]))
      check(worldPoints(node.mesh).every((p) => expected.some((e) => e.distanceTo(p) < EPS)), `${scene.shape} ${k}단계 면 ${face}: 접힌 좌표가 다름`)
    }
  }
  check(JSON.stringify(order) === '[1,5,2,3,4]', `${scene.shape}: 접는 순서는 왼쪽 → 뒷면 → 오른쪽 → 윗면 → 아랫면`)
}

const base = { vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' as const } }
checkBox({ ...base, shape: 'cuboid', size: { width: 4, depth: 2, height: 3 } }, 4, 2, 3)
checkBox({ ...base, shape: 'cube', size: { edge: 2.5 } }, 2.5, 2.5, 2.5)
const cylinder: ShapeScene = { shape: 'cylinder', size: { radius: 1, height: 2 }, vertexLabels: [], lines: [], net: { layout: 'default' } }
check(polyhedronOf(cylinder) === null && foldStepCount(cylinder) === 0, '곡면 도형은 면 트리가 없어야 함')
check(foldStepCount({ ...base, shape: 'cube', size: { edge: 1 } }) === 5, '정육면체 단계 수는 5')
console.log('ok: 직육면체·정육면체 면 트리 (s = 0 입체, s = 1 cross, 바닥에 눕히기, 단계별 접기)')
