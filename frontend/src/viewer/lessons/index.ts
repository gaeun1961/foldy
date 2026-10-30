import type * as THREE from 'three'
import type { ShapeScene } from '../../shared/types.ts'
import type { FaceTree } from '../faceTree.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { boxSizeOf, type LessonKind } from './data.ts'
import { buildDiagonalLesson, buildShortestPathLesson } from './pythagoras.ts'
import { buildSurfaceAreaLesson } from './surfaceArea.ts'
import { buildVolumeLesson } from './volume.ts'

// 설명 모드의 three.js 쪽 (docs/specs/viewer.md "설명 모드"). ThreeViewer 는 buildLesson 으로 만든 group 을 면 트리 루트에 붙이고,
// lesson.progress 가 바뀔 때마다 apply 를 부른다. 설명 종류가 바뀌면 dispose 하고 새로 만든다.
// faceMaterials 가 있으면 그 면은 평소 재질 대신 설명이 준 재질로 그린다 (겉넓이처럼 면을 칠하는 설명)
export interface LessonObject {
  group: THREE.Group
  faceMaterials?: (face: number) => [THREE.Material, THREE.Material] | null
  apply(progress: number): void
  dispose(): void
}

// tree: 면 메시에 직접 붙이는 설명(최단 거리)이 쓴다. 그런 물체는 dispose 에서 스스로 뗀다
export function buildLesson(scene: ShapeScene, poly: Polyhedron, tree: FaceTree, kind: LessonKind, radius: number): LessonObject | null {
  const box = boxSizeOf(scene)
  if (!box) return null
  if (kind === 'volume') return buildVolumeLesson(box, radius)
  if (kind === 'surface-area') return buildSurfaceAreaLesson(poly)
  if (kind === 'diagonal') return buildDiagonalLesson(box, radius)
  if (kind === 'shortest-path') return buildShortestPathLesson(poly, tree, radius)
  return null
}

export { LESSON_HINT, LESSON_LABEL, LESSON_POSE, lessonStepCount, lessonSummary, type Lesson, type LessonKind } from './data.ts'
