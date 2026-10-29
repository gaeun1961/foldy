import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types'

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
  drawLines?: boolean // 선 긋기 모드: 클릭으로 선분의 두 끝점을 고른다 (기본 false)
  edgeDivisions?: 2 | 3 | 4 // 선 긋기에서 모서리 등분 (기본 2 = 중점)
  onSceneChange?: (scene: ShapeScene) => void // 선분이 더해진 새 scene. UI가 다시 scene 으로 넘긴다
  onDrawState?: (state: DrawState) => void // 선 긋기 진행 상태 (안내 문구용)
  pageText?: string[] // 책 장면 왼쪽 페이지 글. 첫 줄 제목, 나머지 본문 (UI가 정한다, viewer.md "책 장면")
  onRouteChoices?: (routes: Line<PolyhedronPoint>[][]) => void // 다른 면을 이은 선의 길 후보 (짧은 순, 첫째가 그은 길). 같은 면 선이면 []
}

// idle: 첫 점을 기다림 / picked: 첫 점을 고름 / no-path: 겉면으로 이을 길을 찾지 못해 긋지 않음 (드묾)
export type DrawState = 'idle' | 'picked' | 'no-path'

export { ThreeViewer as Viewer } from './ThreeViewer'
export { foldStepCount, netCheck } from './polyhedra'
