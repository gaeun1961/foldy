import type { ShapeScene } from '../shared/types'
import type { Lesson } from './lessons/data'

// 뷰어 구현이 지켜야 할 props (docs/specs/viewer.md). UI는 이 인터페이스와 아래 Viewer, foldStepCount 만 사용한다.
// GeoGebra 등으로 바꿀 때는 같은 props 를 받는 컴포넌트를 만들고 아래 export 한 줄만 교체.
export interface ViewerProps {
  scene: ShapeScene
  unfold?: number // 펼침 값 s: 0 = 입체, 1 = 전개도 (기본 0)
  foldMode?: 'all' | 'step' // 한 번에 접기 / 면을 하나씩 접기 (기본 'all')
  showHiddenEdges?: boolean // 가려진 모서리를 점선으로 (기본 true, 보기 옵션)
  showMatchingEdges?: boolean // 접으면 맞닿는 모서리 쌍을 같은 색으로 (기본 true, 보기 옵션)
  showVertexLabels?: boolean // 꼭짓점 라벨 (기본 true, 보기 옵션)
  highlightVertices?: number[] // 강조할 꼭짓점 인덱스. 복사본 모두 색으로, 나머지는 흐리게 (챗봇 화면 조작 TODO-10)
  lesson?: Lesson | null // 설명 모드 (부피 등 공식 시각화). 입체 상태(unfold 0)에서 보여준다. 없으면 보통 보기
}

export { ThreeViewer as Viewer } from './ThreeViewer'
export { foldStepCount } from './polyhedra'
export { LESSON_HINT, LESSON_LABEL, LESSON_POSE, lessonStepCount, lessonSummary, type Lesson, type LessonKind } from './lessons/data'
