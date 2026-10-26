// 다면체 면 트리 데이터 (docs/specs/viewer.md "다면체: 면 트리").
// 새 다면체는 이 파일에 데이터만 추가한다. 렌더링 코드(faceTree.ts)는 도형 이름으로 분기하지 않는다.
// 라이브러리 독립: three.js 타입 없이 숫자만 쓴다.
import type { BoxSize, EdgeSize, RoundSize, ShapeKind, ShapeScene } from '../shared/types.ts'

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
  return [...cut.values()].map(([x, y]) => [x, y])
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

type SizeOf<S extends ShapeKind> = S extends 'cuboid' ? BoxSize : S extends 'cylinder' | 'cone' ? RoundSize : EdgeSize

const POLYHEDRA: { [S in ShapeKind]?: (size: SizeOf<S>) => Polyhedron } = {
  cuboid: ({ width, depth, height }) => ({ positions: boxPositions(width, depth, height), faces: BOX_FACES, foldOrder: BOX_FOLD_ORDER }),
  cube: ({ edge }) => ({ positions: boxPositions(edge, edge, edge), faces: BOX_FACES, foldOrder: BOX_FOLD_ORDER }),
  // TODO-16: 정다면체 4종을 여기에 추가
}

// 면 트리로 그릴 수 있는 도형이면 데이터를, 아니면(곡면 도형, 아직 없는 도형) null
export function polyhedronOf(scene: ShapeScene): Polyhedron | null {
  const make = POLYHEDRA[scene.shape] as ((size: ShapeScene['size']) => Polyhedron) | undefined
  return make ? make(scene.size) : null
}

// 단계별 접기의 단계 수. 면 트리가 없는 도형은 0
export function foldStepCount(scene: ShapeScene) {
  const poly = polyhedronOf(scene)
  return poly ? foldOrderOf(poly).length : 0
}
