// 설명 모드(공식 시각화)의 데이터 쪽: 종류, 자세, 단계 수, 멈춘 뒤 보여줄 공식. three.js 없음 (docs/specs/viewer.md "설명 모드").
// 새 설명(위치 관계 TODO-28, 닮음 TODO-29, 피타고라스 TODO-30)은 LessonKind 와 아래 표들에 한 줄씩 더한다
import type { ShapeScene } from '../../shared/types.ts'
import { polyhedronOf } from '../polyhedra.ts'
import { faceArea, oppositeFacePairs } from './surfaceLayout.ts'
import { volumeLayout } from './volumeLayout.ts'

export type LessonKind = 'volume' | 'surface-area'

export interface Lesson {
  kind: LessonKind
  progress: number // 0 = 시작 전, 1 = 다 보여줌. 단계·속도·멈춤은 UI 가 이 값을 바꿔서 만든다 (접기의 unfold 와 같은 방식)
}

export const LESSON_LABEL: Record<LessonKind, string> = { volume: '부피', 'surface-area': '겉넓이' }

// 어느 자세에서 보여주는지: 'solid' 는 바로 세운 입체(unfold 0), 'net' 은 바닥에 펼친 전개도(unfold 1)
export const LESSON_POSE: Record<LessonKind, 'solid' | 'net'> = { volume: 'solid', 'surface-area': 'net' }

// 시작 전 3D 뷰 아래 안내 한 줄 (ui.md 안내 문구)
export const LESSON_HINT: Record<LessonKind, string> = { volume: '한 층씩 쌓아 볼까요', 'surface-area': '마주 보는 면을 한 쌍씩 칠해 볼까요' }

// 설명을 보여줄 수 있는 도형의 가로·세로·높이. 지금은 직육면체·정육면체만
export function boxSizeOf(scene: ShapeScene) {
  if (scene.shape === 'cuboid') return scene.size
  if (scene.shape === 'cube') return { width: scene.size.edge, depth: scene.size.edge, height: scene.size.edge }
  return null
}

// 단계 수. 설명할 수 없는 도형이면 0
export function lessonStepCount(scene: ShapeScene, kind: LessonKind) {
  const box = boxSizeOf(scene)
  if (!box) return 0
  if (kind === 'volume') return volumeLayout(box.width, box.depth, box.height).layers
  if (kind === 'surface-area') return oppositeFacePairs(polyhedronOf(scene)!).length
  return 0
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))

// 애니메이션이 멈춘 뒤 보여줄 식과 값 (ui.md 친절한 설명 원칙: 글은 멈춘 뒤에)
export function lessonSummary(scene: ShapeScene, kind: LessonKind): { formula: string; value: string } | null {
  const box = boxSizeOf(scene)
  if (!box) return null
  const { width: w, depth: d, height: h } = box
  if (kind === 'volume') return { formula: `가로 × 세로 × 높이 = ${num(w)} × ${num(d)} × ${num(h)}`, value: num(w * d * h) }
  if (kind === 'surface-area') {
    // 쌍마다 면 하나의 넓이. 직육면체는 앞·뒤 = 가로×높이, 왼·오 = 세로×높이, 위·아래 = 가로×세로
    const poly = polyhedronOf(scene)!
    const areas = oppositeFacePairs(poly).map(([f]) => faceArea(poly, f))
    const sum = areas.reduce((s, a) => s + a, 0)
    return { formula: `2 × (${areas.map(num).join(' + ')}) = 2 × ${num(sum)}`, value: num(2 * sum) }
  }
  return null
}
