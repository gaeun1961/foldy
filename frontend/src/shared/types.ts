// ShapeScene: AI(사진 인식)가 만들고 뷰어·UI가 그리는 공용 데이터 계약.
// backend/app/ai/schema.py 와 항상 같은 구조를 유지한다. 바꾸려면 이슈로 먼저 합의하고 docs/specs/shape-scene.md 부터 고친다.
// 자세한 설명과 예시(꼭짓점 인덱스 규칙, 곡면 전개도 좌표): docs/specs/shape-scene.md

export type RegularPolyhedronShape =
  | 'regular-tetrahedron'
  | 'regular-octahedron'
  | 'regular-dodecahedron'
  | 'regular-icosahedron'
export type PolygonSolidShape = 'prism' | 'pyramid' // 각기둥·각뿔 (밑면 정다각형)
export type ShapeKind = 'cuboid' | 'cube' | RegularPolyhedronShape | PolygonSolidShape | 'cylinder' | 'cone' | 'sphere'

// 꼭짓점 수 = vertexLabels 길이. 각기둥·각뿔은 밑면 변 수에 따라 다르다 (vertexCountOf)
export const VERTEX_COUNT: Record<Exclude<ShapeKind, PolygonSolidShape>, number> = {
  cuboid: 8,
  cube: 8,
  'regular-tetrahedron': 4,
  'regular-octahedron': 6,
  'regular-dodecahedron': 20,
  'regular-icosahedron': 12,
  cylinder: 0,
  cone: 1,
  sphere: 0,
}

export interface BoxSize {
  width: number // 가로 (x축)
  depth: number // 깊이 (z축, 화면 앞쪽이 +)
  height: number // 높이 (y축, 위쪽이 +)
}
export interface EdgeSize {
  edge: number // 한 모서리 길이
}
export interface PolygonSize {
  sides: number // 밑면 정다각형의 변 수 (정수 3~12)
  edge: number // 밑면 한 변
  height: number
}
export interface SphereSize {
  radius: number
}
export interface RoundSize {
  radius: number // 밑면 반지름
  height: number
}

// 꼭짓점 인덱스: 0 ~ 꼭짓점 수 - 1 (도형별 규칙은 docs/specs/shape-scene.md)
export type VertexIndex = number

// 다면체 선분 끝점: 꼭짓점 그 자체, 또는 모서리 위의 한 점.
// t 는 edge[0] 에서 edge[1] 쪽으로 간 비율 (0 = edge[0], 1 = edge[1], 0.5 = 중점)
export type PolyhedronPoint = { vertex: VertexIndex } | { edge: [VertexIndex, VertexIndex]; t: number }

// 곡면 도형의 각도: 위에서 볼 때 앞(+z) = 0°, 반시계. seam ~ seam + 360 사이
export type CylinderPoint =
  | { top: number }
  | { bottom: number }
  | { surface: { angle: number; h: number } } // h: 밑면 0 ~ 윗면 1
export type ConePoint =
  | { apex: true }
  | { base: number }
  | { surface: { angle: number; r: number } } // r: 꼭짓점 0 ~ 밑면 둘레 1

// 다면체: 두 끝점은 같은 면 위. 곡면 도형: 옆면 위, 전개도 위의 직선
export interface Line<P> {
  from: P
  to: P
}

interface SceneOf<S extends ShapeKind, Z, P, N> {
  shape: S
  size: Z
  vertexLabels: (string | null)[] // 길이 = vertexCountOf(scene)
  lines: Line<P>[]
  net: N
  problem?: string | null // 사진에서 읽은 인쇄된 문제 문장 (shape-scene.md, 선택)
  photoBox?: PhotoRect | null // 사진 안 전개도 그림의 네모, 0~1 비율 (grid 일 때, 선택)
}
export interface PhotoRect {
  x: number
  y: number
  w: number
  h: number
}
type CrossNet = { layout: 'cross' }
// 학습지 전개도 그대로 (docs/specs/shape-scene.md "전개도 grid"). 평면 좌표: x 오른쪽, y 아래, 단위는 size 와 같음
export interface NetPoint {
  x: number
  y: number
}
export interface NetFace {
  x: number // 왼쪽 위
  y: number
  w: number
  h: number
  text?: string // 면에 쓴 글자·숫자
  fill?: boolean // 색칠한 면
}
export type GridNet = {
  layout: 'grid'
  faces: NetFace[]
  cornerLabels?: (NetPoint & { text: string })[] // 전개도 꼭짓점 라벨, 복사본마다
  lines?: Line<NetPoint>[] // 전개도 위 선. 끝점은 면의 변 위
}
type DefaultNet = { layout: 'default' }
type CurvedNet = { layout: 'default'; seam?: number } // seam: 옆면을 자르는 각도, 기본 0

export type CuboidScene = SceneOf<'cuboid', BoxSize, PolyhedronPoint, CrossNet | GridNet>
export type CubeScene = SceneOf<'cube', EdgeSize, PolyhedronPoint, CrossNet | GridNet>
export type RegularPolyhedronScene = SceneOf<RegularPolyhedronShape, EdgeSize, PolyhedronPoint, DefaultNet>
export type PolygonSolidScene = SceneOf<PolygonSolidShape, PolygonSize, PolyhedronPoint, DefaultNet>
export type CylinderScene = SceneOf<'cylinder', RoundSize, CylinderPoint, CurvedNet>
export type ConeScene = SceneOf<'cone', RoundSize, ConePoint, CurvedNet>
export type SphereScene = SceneOf<'sphere', SphereSize, never, DefaultNet> // 전개도가 없고 선도 없다

export type ShapeScene = CuboidScene | CubeScene | RegularPolyhedronScene | PolygonSolidScene | CylinderScene | ConeScene | SphereScene

// vertexLabels 길이 (shape-scene.md 꼭짓점 수)
export const vertexCountOf = (scene: ShapeScene) =>
  scene.shape === 'prism' ? 2 * scene.size.sides : scene.shape === 'pyramid' ? scene.size.sides + 1 : VERTEX_COUNT[scene.shape]
