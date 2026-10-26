import { mockScene } from './mock'
import type { ShapeScene } from './types'

// 예시 도형: 사진·네트워크 없이도 바로 띄워 볼 수 있는 도형 (docs/specs/ui.md 화면 배치 2번).
// 썸네일로 보여주고 누르면 뷰어에 올린다. 시연용 문제가 정해지면(TODO-15) 그 문제로 바꾼다
const LABELS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ']

export const EXAMPLES: { label: string; scene: ShapeScene }[] = [
  { label: '직육면체 4×2×3', scene: mockScene },
  {
    label: '정육면체 3',
    scene: { shape: 'cube', size: { edge: 3 }, vertexLabels: LABELS, lines: [], net: { layout: 'cross' } },
  },
  {
    label: '직육면체 2×2×5',
    scene: {
      shape: 'cuboid',
      size: { width: 2, depth: 2, height: 5 },
      vertexLabels: LABELS,
      // 윗면 대각선: ㅁ → ㅅ
      lines: [{ from: { vertex: 4 }, to: { vertex: 6 } }],
      net: { layout: 'cross' },
    },
  },
]
