import type { CubeScene, CuboidScene, ShapeScene } from './types'

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

// 학습지 전개도(grid) 예시 (docs/specs/shape-scene.md "전개도 grid"). 학습지 사진의 문제 구조를 데이터로 옮긴 것 (사진은 저장소에 없음).
// 사진 업로드(TODO-11)가 붙기 전까지 화면의 "예시 전개도"로 고른다
const sq = (x: number, y: number, extra: { text?: string; fill?: boolean } = {}) => ({ x, y, w: 1, h: 1, ...extra })
const cubeOf = (net: CubeScene['net']): CubeScene => ({ shape: 'cube', size: { edge: 1 }, vertexLabels: Array(8).fill(null), lines: [], net })

export const sampleScenes: { name: string; scene: ShapeScene }[] = [
  { name: '십자형 직육면체 (기본)', scene: { ...mockScene, lines: [] } },
  {
    name: '계단형 정육면체 (꼭짓점 라벨)',
    scene: cubeOf({
      layout: 'grid',
      faces: [sq(0, 0, { text: '가' }), sq(1, 0, { text: '나' }), sq(1, 1, { text: '다', fill: true }), sq(2, 1, { text: '라' }), sq(2, 2, { text: '마' }), sq(3, 2, { text: '바' })],
      cornerLabels: [
        ['ㄱ', 0, 0], ['ㅎ', 1, 0], ['ㅍ', 2, 0], ['ㄴ', 0, 1], ['ㄷ', 1, 1], ['ㅌ', 2, 1], ['ㅋ', 3, 1],
        ['ㄹ', 1, 2], ['ㅁ', 2, 2], ['ㅊ', 3, 2], ['ㅈ', 4, 2], ['ㅂ', 2, 3], ['ㅅ', 3, 3], ['ㅇ', 4, 3],
      ].map(([text, x, y]) => ({ text: text as string, x: x as number, y: y as number })),
    }),
  },
  {
    name: '잘못 그린 전개도',
    scene: cubeOf({ layout: 'grid', faces: [sq(0, 1), sq(1, 1), sq(2, 1), sq(3, 1), sq(0, 0), sq(1, 0)] }),
  },
  {
    name: '주사위 전개도 (면 숫자)',
    scene: cubeOf({
      layout: 'grid',
      faces: [sq(1, 0, { text: '1' }), sq(0, 1, { text: '2' }), sq(1, 1, { text: '3' }), sq(2, 1, { text: '4' }), sq(2, 2, { text: '5' }), sq(3, 2, { text: '6' })],
    }),
  },
  {
    name: '선이 그려진 전개도 (직육면체)',
    scene: {
      ...mockScene,
      vertexLabels: Array(8).fill(null),
      lines: [],
      net: {
        layout: 'grid',
        faces: [
          { x: 2, y: 2, w: 4, h: 3 },
          { x: 0, y: 2, w: 2, h: 3 },
          { x: 6, y: 2, w: 2, h: 3 },
          { x: 8, y: 2, w: 4, h: 3 },
          { x: 2, y: 0, w: 4, h: 2 },
          { x: 2, y: 5, w: 4, h: 2 },
        ],
        lines: [{ from: { x: 2, y: 2 }, to: { x: 8, y: 5 } }],
      },
    },
  },
]
