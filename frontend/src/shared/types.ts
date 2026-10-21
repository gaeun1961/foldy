// ShapeScene: AI(사진 인식)가 만들고 뷰어·UI가 그리는 공용 데이터 계약.
// backend/app/ai/schema.py 와 항상 같은 구조를 유지한다. 바꾸려면 이슈로 먼저 합의하고 docs/02-specs.md 부터 고친다.
// 자세한 설명과 예시: docs/02-specs.md

export type ShapeKind = 'cuboid' | 'cube'

export interface Size {
  width: number // 가로 (x축)
  depth: number // 세로/깊이 (z축, 화면 앞쪽이 +)
  height: number // 높이 (y축, 위쪽이 +)
}

// 꼭짓점 인덱스 규칙 (도형 중심이 원점, 앞쪽 = 보는 사람 쪽)
//
//       7 ------- 6        아랫면: 0 앞왼쪽, 1 앞오른쪽, 2 뒤오른쪽, 3 뒤왼쪽
//      /|        /|        윗면:   4~7 은 각각 0~3 바로 위
//     4 ------- 5 |
//     | 3 ------|- 2
//     |/        |/
//     0 ------- 1
export type VertexIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

// 선분 끝점: 꼭짓점 그 자체, 또는 모서리 위의 한 점.
// t 는 edge[0] 에서 edge[1] 쪽으로 간 비율 (0 = edge[0], 1 = edge[1], 0.5 = 중점)
export type LinePoint =
  | { vertex: VertexIndex }
  | { edge: [VertexIndex, VertexIndex]; t: number }

// 면 위의 선분. 두 끝점은 같은 면 위에 있어야 한다.
export interface FaceLine {
  from: LinePoint
  to: LinePoint
}

// 전개도 배치. 1차는 십자형 기본 전개도 하나만 (모양은 docs/02-specs.md 참고)
export interface Net {
  layout: 'cross'
}

export interface ShapeScene {
  shape: ShapeKind
  size: Size
  vertexLabels: (string | null)[] // 길이 8, 인덱스는 위 꼭짓점 규칙
  lines: FaceLine[]
  net: Net
}
