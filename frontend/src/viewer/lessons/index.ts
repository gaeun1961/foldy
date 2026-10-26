import type * as THREE from 'three'
import type { ShapeScene } from '../../shared/types.ts'
import { boxSizeOf, type LessonKind } from './data.ts'
import { buildVolumeLesson } from './volume.ts'

// 설명 모드의 three.js 쪽 (docs/specs/viewer.md "설명 모드"). ThreeViewer 는 buildLesson 으로 만든 group 을 면 트리 루트에 붙이고,
// lesson.progress 가 바뀔 때마다 apply 를 부른다. 설명 종류가 바뀌면 dispose 하고 새로 만든다
export interface LessonObject {
  group: THREE.Group
  apply(progress: number): void
  dispose(): void
}

export function buildLesson(scene: ShapeScene, kind: LessonKind, radius: number): LessonObject | null {
  const box = boxSizeOf(scene)
  if (!box) return null
  if (kind === 'volume') return buildVolumeLesson(box, radius)
  return null
}

export { LESSON_LABEL, lessonStepCount, lessonSummary, type Lesson, type LessonKind } from './data.ts'
