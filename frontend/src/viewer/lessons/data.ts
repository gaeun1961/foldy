// 설명 모드(공식 시각화)의 데이터 쪽: 종류, 단계 수, 멈춘 뒤 보여줄 공식. three.js 없음 (docs/specs/viewer.md "설명 모드").
// 새 설명(겉넓이 TODO-25, 위치 관계 TODO-28, 닮음 TODO-29, 피타고라스 TODO-30)은 LessonKind 와 아래 표에 한 줄씩 더한다
import type { ShapeScene } from '../../shared/types.ts'
import { volumeLayout } from './volumeLayout.ts'

export type LessonKind = 'volume'

export interface Lesson {
  kind: LessonKind
  progress: number // 0 = 시작 전, 1 = 다 보여줌. 단계·속도·멈춤은 UI 가 이 값을 바꿔서 만든다 (접기의 unfold 와 같은 방식)
}

export const LESSON_LABEL: Record<LessonKind, string> = { volume: '부피' }

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
  return 0
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))

// 애니메이션이 멈춘 뒤 보여줄 식과 값 (ui.md 친절한 설명 원칙: 글은 멈춘 뒤에)
export function lessonSummary(scene: ShapeScene, kind: LessonKind): { formula: string; value: string } | null {
  const box = boxSizeOf(scene)
  if (!box) return null
  const { width: w, depth: d, height: h } = box
  if (kind === 'volume') return { formula: `가로 × 세로 × 높이 = ${num(w)} × ${num(d)} × ${num(h)}`, value: num(w * d * h) }
  return null
}
