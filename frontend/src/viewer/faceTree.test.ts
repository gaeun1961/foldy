// 면 트리 검사: 접힌 상태(s = 0)는 원래 입체, 다 펼친 상태(s = 1)는 viewer.md 의 cross 배치인지 확인.
// 실행: frontend 폴더에서 `npm test` (= node src/viewer/faceTree.test.ts)
import * as THREE from 'three'
import { applyUnfold, buildFaceTree, facePoints, layOnFloor, lineOnSurface, placeLines, stepUnfold } from './faceTree.ts'
import { foldOrderOf, foldStepCount, matchingEdges, polyhedronOf, type Polyhedron } from './polyhedra.ts'
import type { PolyhedronPoint, ShapeScene } from '../shared/types.ts'

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
  checkMatchingEdges(scene, poly)
}

// 맞닿는 모서리 (viewer.md "맞닿는 모서리"): 7쌍, 쌍마다 다른 면의 같은 두 꼭짓점, 붙는 모서리 5개와 합쳐 모서리 12개
function checkMatchingEdges(scene: ShapeScene, poly: Polyhedron) {
  const pairs = matchingEdges(poly)
  const key = ([a, b]: number[]) => [a, b].sort().join('-')
  check(pairs.length === 7, `${scene.shape}: 맞닿는 모서리 쌍이 ${pairs.length}개`)
  check(pairs.every(([x, y]) => x[0] !== y[0] && key(x[1]) === key(y[1])), `${scene.shape}: 쌍이 다른 면의 같은 모서리가 아님`)
  const edges = new Set([...pairs.map(([x]) => key(x[1])), ...poly.faces.flatMap((f) => (f.hinge ? [key(f.hinge)] : []))])
  check(edges.size === 12, `${scene.shape}: 붙는 모서리 + 맞닿는 모서리가 12개가 아님`)
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
// 면 위 선분 (viewer.md "선분"): 목 데이터 4×2×3 의 앞면 대각선, 윗면 중점 연결
{
  const poly = polyhedronOf({ ...base, shape: 'cuboid', size: { width: 4, depth: 2, height: 3 } })!
  const near = (a: number[], b: number[]) => a.every((v, k) => Math.abs(v - b[k]) < EPS)
  const [diag, mid, offFace, notEdge, onEdge] = placeLines(poly, [
    { from: { vertex: 0 }, to: { vertex: 5 } },
    { from: { edge: [4, 5], t: 0.5 }, to: { edge: [6, 7], t: 0.5 } },
    { from: { vertex: 0 }, to: { vertex: 6 } }, // 마주 보는 꼭짓점: 같은 면에 없음
    { from: { edge: [0, 5], t: 0.5 }, to: { vertex: 1 } }, // 0-5 는 앞면의 대각선이지 모서리가 아님
    { from: { vertex: 0 }, to: { vertex: 1 } }, // 앞면·아랫면이 공유하는 모서리 → 작은 면 인덱스(앞면 0)
  ])
  check(diag?.face === 0 && near(diag.from, [-2, -1.5, 1]) && near(diag.to, [2, 1.5, 1]), `앞면 대각선 ${JSON.stringify(diag)}`)
  check(mid?.face === 3 && near(mid.from, [0, 1.5, 1]) && near(mid.to, [0, 1.5, -1]), `윗면 중점 연결 ${JSON.stringify(mid)}`)
  check(offFace === null && notEdge === null, '같은 면에 없는 선분은 null')
  check(onEdge?.face === 0, '여러 면에 맞으면 가장 작은 면 인덱스')

  // 선 긋기 점 (viewer.md "선 긋기"): 앞면(0-1-5-4)을 3등분하면 꼭짓점 4 + 모서리 4개 × 2점
  const points = facePoints(poly, 0, 3)
  check(points.length === 4 + 4 * 2, `3등분 점 수 ${points.length}`)
  const third = points.find((p) => 'edge' in p.point && p.point.edge[0] === 0 && p.point.t === 1 / 3)!
  check(near(third.at, [-2 + 4 / 3, -1.5, 1]), `0→1 모서리 1/3 지점 ${third.at}`)
  check(facePoints(poly, 0, 2).filter((p) => 'edge' in p.point).length === 4, '2등분은 모서리마다 중점 하나')
  // 고른 두 점으로 만든 선분은 그 면에 놓인다 (3등분점 → 맞은편 꼭짓점)
  check(placeLines(poly, [{ from: third.point, to: { vertex: 5 } }])[0]?.face === 0, '등분점 선분이 앞면에 놓임')

  // 다른 면의 두 점: 겉면 최단 경로 (viewer.md "선 긋기"). 선분마다 면 위에 놓이고, 이어진 한 줄이며, 길이가 최단이어야 한다
  const surfacePath = (from: PolyhedronPoint, to: PolyhedronPoint) => {
    const lines = lineOnSurface(poly, from, to)!
    check(!!lines, `이을 수 없음 ${JSON.stringify([from, to])}`)
    const placed = placeLines(poly, lines).map((l) => l!)
    check(placed.every(Boolean), `면 위에 없는 선분 ${JSON.stringify(lines)}`)
    placed.slice(1).forEach((l, i) => check(near(placed[i].to, l.from), `선분 ${i}, ${i + 1} 이 끊김`))
    const length = placed.reduce((sum, l) => sum + Math.hypot(...l.to.map((v, k) => v - l.from[k])), 0)
    return { faces: placed.map((l) => l.face), length }
  }
  // 앞면 꼭짓점 0 → 반대쪽 꼭짓점 6 (4×2×3): 펼치는 방법 셋 √45, √53, √41 중 가장 짧은 √41
  const corner = surfacePath({ vertex: 0 }, { vertex: 6 })
  check(Math.abs(corner.length - Math.sqrt(41)) < 1e-6, `모서리 끝 → 반대 끝 최단 거리 ${corner.length}`)
  // 왼쪽 면 → 윗면 (십자형 전개도에서는 떨어져 있는 두 면): 둘이 붙은 모서리를 곧장 넘으면 3 + 4 = 7 이지만,
  // 앞면(또는 뒷면)을 비스듬히 지나면 √(5² + 4²) = √41 로 더 짧다 (거미와 파리 문제처럼 세 면을 지나는 길)
  const leftTop = surfacePath({ edge: [3, 0], t: 0.5 }, { edge: [5, 6], t: 0.5 })
  check(leftTop.faces.length === 3 && Math.abs(leftTop.length - Math.sqrt(41)) < 1e-6, `왼쪽 면 → 윗면 ${JSON.stringify(leftTop)}`)
  // 앞면 아래 모서리 가운데 → 윗면 뒤 모서리 가운데: 3 + 2 = 5
  check(Math.abs(surfacePath({ edge: [0, 1], t: 0.5 }, { edge: [6, 7], t: 0.5 }).length - 5) < 1e-6, '앞면 → 윗면 뒤 모서리 5')
}

const cylinder: ShapeScene = { shape: 'cylinder', size: { radius: 1, height: 2 }, vertexLabels: [], lines: [], net: { layout: 'default' } }
check(polyhedronOf(cylinder) === null && foldStepCount(cylinder) === 0, '곡면 도형은 면 트리가 없어야 함')
check(foldStepCount({ ...base, shape: 'cube', size: { edge: 1 } }) === 5, '정육면체 단계 수는 5')
console.log('ok: 직육면체·정육면체 면 트리 (s = 0 입체, s = 1 cross, 바닥에 눕히기, 단계별 접기, 맞닿는 모서리, 면 위 선분, 선 긋기 점, 겉면 최단 경로)')
