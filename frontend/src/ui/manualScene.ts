// 직접 만들기 (docs/specs/ui.md 화면 배치 3번): 치수로 만들기 · 전개도 그리기 → ShapeScene. 사진 인식(LLM) 없이 쓰는 기본 길
import { vertexCountOf, type BoxSize, type EdgeSize, type NetFace, type PolygonSize, type RoundSize, type ShapeScene } from '../shared/types.ts'
import type { NetPhoto } from '../viewer'

// 도형 드롭다운과 슬라이더 목록 (직육면체·정육면체, 정다면체 4종, 각기둥·각뿔. 다른 도형은 여기에 한 줄씩 더한다). 순서가 빈 책 차례 순서다.
// 각기둥·각뿔은 밑면 정다각형 변 수(sides)를 드롭다운으로 고른다 (SIDES)
// 기본 치수는 서로 다른 양이 같은 숫자로 나오지 않게 고른다 (ui.md 공식 시각화 규칙: 원기둥 r = 3 은 밑넓이 9π, 둘레 6π, 사각뿔 6·4 는 옆면 높이 5)
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
  { shape: 'regular-tetrahedron', name: '정사면체', sliders: [{ key: 'edge', label: '한 변' }], size: { edge: 3 } as EdgeSize },
  { shape: 'regular-octahedron', name: '정팔면체', sliders: [{ key: 'edge', label: '한 변' }], size: { edge: 3 } as EdgeSize },
  { shape: 'regular-dodecahedron', name: '정십이면체', sliders: [{ key: 'edge', label: '한 변' }], size: { edge: 2 } as EdgeSize },
  { shape: 'regular-icosahedron', name: '정이십면체', sliders: [{ key: 'edge', label: '한 변' }], size: { edge: 2 } as EdgeSize },
  { shape: 'prism', name: '각기둥', sliders: [{ key: 'edge', label: '밑면 한 변' }, { key: 'height', label: '높이' }], size: { sides: 4, edge: 3, height: 5 } as PolygonSize },
  { shape: 'pyramid', name: '각뿔', sliders: [{ key: 'edge', label: '밑면 한 변' }, { key: 'height', label: '높이' }], size: { sides: 4, edge: 6, height: 4 } as PolygonSize },
  { shape: 'cylinder', name: '원기둥', sliders: [{ key: 'radius', label: '반지름' }, { key: 'height', label: '높이' }], size: { radius: 3, height: 5 } as RoundSize },
  { shape: 'cone', name: '원뿔', sliders: [{ key: 'radius', label: '반지름' }, { key: 'height', label: '높이' }], size: { radius: 3, height: 4 } as RoundSize },
] as const
export const SIDES = [3, 4, 5, 6, 7, 8] // 각기둥·각뿔 밑면 드롭다운 (삼각형 ~ 팔각형)
export type BoxShape = (typeof SHAPES)[number]['shape']

const DEFAULT_LABELS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'] // 라벨이 없으면 채운다 (TODO-12)

// 치수로 만들기: 직육면체·정육면체는 십자형 전개도, 그 밖(정다면체·각기둥·각뿔)은 기본 전개도에 라벨 없음.
// 선은 그대로 둔다(꼭짓점 번호는 치수와 상관없음, 같은 꼭짓점 번호를 쓰는 도형끼리만: 각기둥·각뿔은 밑면 변 수도 같아야).
// 직육면체·정육면체는 라벨이 하나도 없으면 ㄱ~ㅇ
export function crossScene(shape: BoxShape, size: BoxSize | EdgeSize | PolygonSize | RoundSize, keep?: ShapeScene | null): ShapeScene {
  if (shape !== 'cuboid' && shape !== 'cube') {
    const sameSides = !('sides' in size) || (keep?.size as Partial<PolygonSize> | undefined)?.sides === size.sides
    const lines = keep?.shape === shape && keep.net.layout === 'default' && sameSides ? keep.lines : []
    const scene = { shape, size, vertexLabels: [], lines, net: { layout: 'default' } } as unknown as ShapeScene
    return { ...scene, vertexLabels: Array(vertexCountOf(scene)).fill(null) }
  }
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

// 십자형 → 같은 모양의 grid 전개도 (면 표시를 쓰려고, ui.md 화면 배치 5번). shape-scene.md cross 배치:
// [왼][앞][오][뒤] 한 줄, 위·아래는 앞면에 붙는다. 가로 w, 세로(깊이) d, 높이 h. 선은 꼭짓점 번호가 달라져서 옮기지 않는다
export function crossToGrid(scene: ShapeScene): ShapeScene {
  const s = scene.size as Partial<Record<'width' | 'depth' | 'height' | 'edge', number>>
  const [w, d, h] = s.edge ? [s.edge, s.edge, s.edge] : [s.width!, s.depth!, s.height!]
  const faces: NetFace[] = [
    { x: 0, y: d, w: d, h },
    { x: d, y: d, w, h },
    { x: d + w, y: d, w: d, h },
    { x: 2 * d + w, y: d, w, h },
    { x: d, y: 0, w, h: d },
    { x: d, y: d + h, w, h: d },
  ]
  return { ...scene, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'grid', faces } } as ShapeScene
}

// 칸 위를 끈 두 칸 (a, b) → 둘을 꼭짓점으로 하는 직사각형 면 (칸 단위)
export function rectOf(a: { x: number; y: number }, b: { x: number; y: number }): NetFace {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 }
}

// 두 면이 넓이가 있게 겹치는가 (변만 맞닿는 것은 겹침이 아니다)
export const overlaps = (a: NetFace, b: NetFace) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// 전개도 그리기 칸 (ManualInput.tsx)
export const CELL = 20 // SVG 안 칸 크기 (화면에서는 폭에 맞게 늘어난다)
export const PHOTO_W = 12 * CELL // 깐 사진의 처음 폭 (칸이 늘어나도 사진 크기는 그대로)

// 깐 사진 위치: SVG 단위로 옮긴 만큼(x, y), 크기 배율, 돌린 각도(도). 사진 가운데를 기준으로 키우고 돌린다
export type PhotoFit = { x: number; y: number; scale: number; angle: number }
export const NO_FIT: PhotoFit = { x: 0, y: 0, scale: 1, angle: 0 }

// 사진에서 고른 네모(사진 비율 0~1)에 인식된 전개도를 맞추는 사진 위치 (ui.md 화면 배치 2번).
// 사진은 PHOTO_W 정사각형 안에 비율대로 들어간다(SVG preserveAspectRatio meet). 네모 가운데 → 전개도 가운데, 크기는 가로·세로 배율의 평균.
// aspect: 사진 가로 / 세로
export type PhotoBox = { x: number; y: number; w: number; h: number }
export function fitToBox(box: PhotoBox, aspect: number, faces: NetFace[]): PhotoFit {
  const P = PHOTO_W
  const dw = aspect >= 1 ? P : P * aspect
  const dh = aspect >= 1 ? P / aspect : P
  const x0 = Math.min(...faces.map((f) => f.x))
  const y0 = Math.min(...faces.map((f) => f.y))
  const nw = Math.max(...faces.map((f) => f.x + f.w)) - x0
  const nh = Math.max(...faces.map((f) => f.y + f.h)) - y0
  const scale = ((nw * CELL) / (box.w * dw) + (nh * CELL) / (box.h * dh)) / 2
  const c = P / 2
  const px = (P - dw) / 2 + (box.x + box.w / 2) * dw // 확대 전 네모 가운데 (SVG)
  const py = (P - dh) / 2 + (box.y + box.h / 2) * dh
  return { x: (x0 + nw / 2) * CELL - c - scale * (px - c), y: (y0 + nh / 2) * CELL - c - scale * (py - c), scale, angle: 0 }
}

// 3D 뷰어에 넘길 사진 위치 (viewer.md ViewerProps photo): SVG 단위 → 칸 단위, 사진 가운데 기준
export const netPhoto = (src: string, fit: PhotoFit): NetPhoto => ({
  src,
  x: (PHOTO_W / 2 + fit.x) / CELL,
  y: (PHOTO_W / 2 + fit.y) / CELL,
  size: (PHOTO_W * fit.scale) / CELL,
  angle: fit.angle,
})
