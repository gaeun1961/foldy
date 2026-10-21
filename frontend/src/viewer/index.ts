import type { ShapeScene } from '../shared/types'

// 뷰어 구현이 지켜야 할 props (docs/specs/viewer.md). UI는 이 인터페이스와 아래 Viewer 만 사용한다.
// GeoGebra 등으로 바꿀 때는 같은 props 를 받는 컴포넌트를 만들고 아래 export 한 줄만 교체.
export interface ViewerProps {
  scene: ShapeScene
  unfold?: number // 펼침 값 s: 0 = 입체, 1 = 전개도 (기본 0)
}

export { ThreeViewer as Viewer } from './ThreeViewer'
