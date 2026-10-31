import type { ViewerProps } from '.'
import { CurvedViewer } from './CurvedViewer'
import { ThreeViewer } from './ThreeViewer'

// 도형에 맞는 화면을 고른다: 곡면 도형은 말기(curved.ts), 구는 같은 화면에 입체만, 나머지는 면 트리
export function Viewer(props: ViewerProps) {
  return props.scene.shape === 'cylinder' || props.scene.shape === 'cone' || props.scene.shape === 'sphere' || props.scene.shape === 'revolution' ? <CurvedViewer {...props} /> : <ThreeViewer {...props} />
}
