import type { ShapeScene } from '../shared/types'

// 뷰어 구현이 지켜야 할 props (docs/specs/viewer.md). UI는 이 인터페이스와 아래 Viewer, foldStepCount 만 사용한다.
// GeoGebra 등으로 바꿀 때는 같은 props 를 받는 컴포넌트를 만들고 아래 export 한 줄만 교체.
export interface ViewerProps {
  scene: ShapeScene
  unfold?: number // 펼침 값 s: 0 = 입체, 1 = 전개도 (기본 0)
  foldMode?: 'all' | 'step' // 한 번에 접기 / 면을 하나씩 접기 (기본 'all')
  showHiddenEdges?: boolean // 가려진 모서리를 점선으로 (기본 true, 보기 옵션)
  interactive?: boolean // 마우스·터치로 돌리고 확대할 수 있는지 (기본 true). 썸네일은 false
}

export { ThreeViewer as Viewer } from './ThreeViewer'
export { foldStepCount } from './polyhedra'
