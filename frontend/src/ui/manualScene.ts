// 직접 만들기 (docs/specs/ui.md 화면 배치 3번): 치수로 만들기 · 전개도 그리기 → ShapeScene. 사진 인식(LLM) 없이 쓰는 기본 길
import type { BoxSize, EdgeSize, NetFace, ShapeScene } from '../shared/types.ts'

// 도형 드롭다운과 슬라이더 목록 (1차는 직육면체·정육면체. 다른 도형은 여기에 한 줄씩 더한다)
// 슬라이더 범위: 1 ~ 10 (학습지 cm 그대로), 0.5 단위
export const SLIDER = { min: 1, max: 10, step: 0.5 }
export const SHAPES = [
  {
    shape: 'cuboid',
    name: '직육면체',
    sliders: [
      { key: 'width', label: '가로' },
      { key: 'depth', label: '세로' },
      { key: 'height', label: '높이' },
    ],
    size: { width: 4, depth: 2, height: 3 } as BoxSize,
  },
  { shape: 'cube', name: '정육면체', sliders: [{ key: 'edge', label: '한 변' }], size: { edge: 3 } as EdgeSize },
] as const
export type BoxShape = (typeof SHAPES)[number]['shape']

const DEFAULT_LABELS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'] // 라벨이 없으면 채운다 (TODO-12)

// 치수로 만들기: 십자형 전개도. 선은 그대로 둔다(꼭짓점 번호는 치수와 상관없음). 라벨이 하나도 없으면 ㄱ~ㅇ
export function crossScene(shape: BoxShape, size: BoxSize | EdgeSize, keep?: ShapeScene | null): ShapeScene {
  const labels = keep?.vertexLabels.some(Boolean) ? keep.vertexLabels : DEFAULT_LABELS
  const lines = keep && keep.net.layout === 'cross' ? keep.lines : []
  return { shape, size, vertexLabels: labels, lines, net: { layout: 'cross' } } as ShapeScene
}

// 전개도 그리기: 그린 면들 그대로 grid 전개도. 모든 면이 같은 정사각형이면 정육면체, 아니면 직육면체.
// size 는 면 변 길이에서 어림한 치수 정보다 (모양은 faces 가 정한다)
export function gridScene(faces: NetFace[]): ShapeScene {
  const sides = [...new Set(faces.flatMap((f) => [f.w, f.h]))].sort((a, b) => a - b)
  const net = { layout: 'grid' as const, faces }
  const base = { vertexLabels: Array(8).fill(null), lines: [], net }
  if (sides.length === 1) return { ...base, shape: 'cube', size: { edge: sides[0] } }
  const [depth, height, width] = [sides[0], sides[Math.min(1, sides.length - 1)], sides[sides.length - 1]]
  return { ...base, shape: 'cuboid', size: { width, depth, height } }
}

// 칸 위를 끈 두 칸 (a, b) → 둘을 꼭짓점으로 하는 직사각형 면 (칸 단위)
export function rectOf(a: { x: number; y: number }, b: { x: number; y: number }): NetFace {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 }
}

// 두 면이 넓이가 있게 겹치는가 (변만 맞닿는 것은 겹침이 아니다)
export const overlaps = (a: NetFace, b: NetFace) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
