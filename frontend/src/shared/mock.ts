import type { CuboidScene } from './types'

// AI 기능이 붙기 전까지 쓰는 예시. backend/app/ai/vision.py 의 MOCK_SCENE 과 같은 내용.
export const mockScene: CuboidScene = {
  shape: 'cuboid',
  size: { width: 4, depth: 2, height: 3 },
  vertexLabels: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'],
  lines: [
    // 앞면 대각선: ㄱ → ㅂ
    { from: { vertex: 0 }, to: { vertex: 5 } },
    // 윗면: 모서리 ㅁㅂ 의 중점 → 모서리 ㅅㅇ 의 중점
    { from: { edge: [4, 5], t: 0.5 }, to: { edge: [6, 7], t: 0.5 } },
  ],
  net: { layout: 'cross' },
}
