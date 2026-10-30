import type * as THREE from 'three'
import type { ShapeScene } from '../../shared/types.ts'
import type { FaceTree } from '../faceTree.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { boxCenterOf, boxSizeOf, type LessonKind } from './data.ts'
import { buildEdgeRelationsLesson } from './edgeRelations.ts'
import { buildDiagonalLesson, buildShortestPathLesson } from './pythagoras.ts'
import { buildSimilarLesson } from './similar.ts'
import { buildSurfaceAreaLesson } from './surfaceArea.ts'
import { buildVolumeLesson } from './volume.ts'
import { textSprite, v3 } from './draw.ts'
import { boxLengthLabels, faceLengthLabels } from './lengthLabels.ts'

// 설명 모드의 three.js 쪽 (docs/specs/viewer.md "설명 모드"). ThreeViewer 는 buildLesson 으로 만든 group 을 면 트리 루트에 붙이고,
// lesson.progress 가 바뀔 때마다 apply 를 부른다. 설명 종류가 바뀌면 dispose 하고 새로 만든다.
// faceMaterials 가 있으면 그 면은 평소 재질 대신 설명이 준 재질로 그린다 (겉넓이처럼 면을 칠하는 설명).
// bounds 가 있으면(접힌 입체 좌표) 카메라가 그 범위를 담는다 (닮음처럼 입체 밖에 물체를 두는 설명).
// pickTargets 가 있으면 화면을 누를 때 그것들을 먼저 맞혀 보고, 맞으면 pick 을 부른다 (위치 관계에서 기준 모서리 바꾸기)
export interface LessonObject {
  group: THREE.Group
  faceMaterials?: (face: number) => [THREE.Material, THREE.Material] | null
  bounds?: THREE.Box3
  pickTargets?: THREE.Object3D[]
  pick?(target: THREE.Object3D): void
  apply(progress: number): void
  dispose(): void
}

// tree: 면 메시에 직접 붙이는 설명(최단 거리)이 쓴다. 그런 물체는 dispose 에서 스스로 뗀다
export function buildLesson(scene: ShapeScene, poly: Polyhedron, tree: FaceTree, kind: LessonKind, radius: number, scale = 2): LessonObject | null {
  const box = boxSizeOf(scene)
  if (!box) return null
  // 상자 치수로 그리는 설명은 가운데가 원점이라, 실제 입체 가운데로 옮긴다 (전개도 grid 로 접은 입체)
  const centered = (lesson: LessonObject) => {
    const [x, y, z] = boxCenterOf(scene)
    lesson.group.position.set(x, y, z)
    lesson.bounds?.translate(lesson.group.position)
    return lesson
  }
  // 모서리 길이 글자 (viewer.md "모서리 길이 표시"). 입체는 설명 물체에, 전개도는 면 메시에 붙인다. 설명을 끄면 같이 지운다
  const size = Math.max(box.width, box.depth, box.height)
  const labelled = (lesson: LessonObject, net: boolean, width = net ? 0.32 : 0.3) => {
    const made = net
      ? tree.nodes.flatMap((n) => faceLengthLabels(poly, n.face).map((l) => ({ l, parent: n.mesh as THREE.Object3D })))
      : boxLengthLabels(box).map((l) => ({ l, parent: lesson.group as THREE.Object3D }))
    const sprites = made.map(({ l, parent }) => {
      const s = textSprite(l.text, size * width)
      s.sprite.position.copy(v3(l.at))
      parent.add(s.sprite)
      return s
    })
    const dispose = lesson.dispose
    lesson.dispose = () => {
      sprites.forEach((s) => s.dispose())
      dispose()
    }
    return lesson
  }
  if (kind === 'volume') return labelled(centered(buildVolumeLesson(box, radius)), false)
  if (kind === 'surface-area') return labelled(buildSurfaceAreaLesson(poly), true)
  if (kind === 'diagonal') return labelled(centered(buildDiagonalLesson(box, radius)), false)
  if (kind === 'shortest-path') return labelled(buildShortestPathLesson(poly, tree, radius), true)
  if (kind === 'edge-relations') return buildEdgeRelationsLesson(poly, radius)
  if (kind === 'similar') return labelled(centered(buildSimilarLesson(box, scale, radius)), false, 0.5) // 닮음은 카메라가 멀어서 글자를 크게
  return null
}

export { LESSON_HINT, LESSON_LABEL, lessonHint, LESSON_POSE, lessonStepCount, lessonSummary, type Lesson, type LessonKind } from './data.ts'
