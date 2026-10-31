import type * as THREE from 'three'
import type { ShapeScene } from '../../shared/types.ts'
import type { FaceTree } from '../faceTree.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { boxCenterOf, boxSizeOf, planOf, type LessonKind } from './data.ts'
import { buildEdgeRelationsLesson } from './edgeRelations.ts'
import { buildDiagonalLesson, buildShortestPathLesson } from './pythagoras.ts'
import { buildSimilarLesson } from './similar.ts'
import { buildSurfaceAreaLesson } from './surfaceArea.ts'
import { buildVolumeLesson } from './volume.ts'
import { textSprite, v3 } from './draw.ts'
import { boxLengthLabels, faceLengthLabels, solidLengthLabels } from './lengthLabels.ts'
import { buildSimilarSolidLesson } from './similarSolid.ts'
import { buildCountsLesson } from './counts.ts'
import { prismBasePoints, pyramidPoints, withPythagorasStep } from './pythagorasStep.ts'
import { slantPlan } from './regularLayout.ts'
import { buildRegularSurfaceLesson, buildRegularVolumeLesson } from './regularMeasure.ts'
import { surfaceGroups } from './surfaceLayout.ts'
import { buildPrismVolumeLesson, buildPyramidVolumeLesson } from './solidVolume.ts'

// 설명 모드의 three.js 쪽 (docs/specs/viewer.md "설명 모드"). ThreeViewer 는 buildLesson 으로 만든 group 을 면 트리 루트에 붙이고,
// lesson.progress 가 바뀔 때마다 apply 를 부른다. 설명 종류가 바뀌면 dispose 하고 새로 만든다.
// faceMaterials 가 있으면 그 면은 평소 재질 대신 설명이 준 재질로 그린다 (겉넓이처럼 면을 칠하는 설명).
// bounds 가 있으면(접힌 입체 좌표) 카메라가 그 범위를 담는다 (닮음처럼 입체 밖에 물체를 두는 설명).
// pickTargets 가 있으면 화면을 누를 때 그것들을 먼저 맞혀 보고, 맞으면 pick 을 부른다 (위치 관계에서 기준 모서리 바꾸기)
export interface LessonObject {
  group: THREE.Group
  faceMaterials?: (face: number) => [THREE.Material, THREE.Material] | null
  bounds?: THREE.Box3
  view?: THREE.Vector3 // 카메라를 이 방향으로 낮춘다 (높이가 중요한 설명). 설명을 끄면 처음 방향으로 돌아간다
  pickTargets?: THREE.Object3D[]
  pick?(target: THREE.Object3D): void
  apply(progress: number): void
  dispose(): void
}

// tree: 면 메시에 직접 붙이는 설명(최단 거리)이 쓴다. 그런 물체는 dispose 에서 스스로 뗀다
export function buildLesson(scene: ShapeScene, poly: Polyhedron, tree: FaceTree, kind: LessonKind, radius: number, scale = 2): LessonObject | null {
  const box = boxSizeOf(scene)
  // 상자 치수로 그리는 설명은 가운데가 원점이라, 실제 입체 가운데로 옮긴다 (전개도 grid 로 접은 입체)
  const centered = (lesson: LessonObject) => {
    const [x, y, z] = boxCenterOf(scene)
    lesson.group.position.set(x, y, z)
    lesson.bounds?.translate(lesson.group.position)
    return lesson
  }
  // 모서리 길이 글자 (viewer.md "모서리 길이 표시"). 입체는 설명 물체에, 전개도는 면 메시에 붙인다. 설명을 끄면 같이 지운다
  const size = box ? Math.max(box.width, box.depth, box.height) : Math.max(...poly.positions.flatMap((p) => p.map(Math.abs))) * 1.6
  const labelled = (lesson: LessonObject, net = false) => {
    const made = net
      ? tree.nodes.flatMap((n) => faceLengthLabels(poly, n.face).map((l) => ({ l, parent: n.mesh as THREE.Object3D })))
      : (box ? boxLengthLabels(box) : solidLengthLabels(poly)).map((l) => ({ l, parent: lesson.group as THREE.Object3D }))
    const sprites = made.map(({ l, parent }) => {
      const s = textSprite(l.text, size * (net ? 0.32 : 0.3))
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
  if (kind === 'surface-area') {
    // 재는 선과 식은 면 좌표에 그린다. 입체 가운데로 옮기는 만큼 되돌린다
    const [x, y, z] = boxCenterOf(scene)
    const plan = planOf(scene)
    if (plan) return buildRegularSurfaceLesson(poly, plan)
    const lesson = centered(buildSurfaceAreaLesson(poly, [-x, -y, -z], !!box))
    const slant = slantPlan(scene)
    return slant ? withPythagorasStep(lesson, surfaceGroups(poly).length, slant, scene.shape === 'pyramid' ? pyramidPoints(poly) : prismBasePoints(poly)) : lesson
  }
  if (kind === 'edge-relations') return buildEdgeRelationsLesson(poly, radius)
  if (kind === 'similar') return box ? centered(buildSimilarLesson(box, scale, radius)) : buildSimilarSolidLesson(poly, scale, radius)
  if (kind === 'volume') {
    const volume = planOf(scene)?.volume
    if (volume) return buildRegularVolumeLesson(poly, volume)
    if (box) return labelled(centered(buildVolumeLesson(box, radius)))
    if (scene.shape === 'prism') return labelled(buildPrismVolumeLesson(poly, scene.size))
    if (scene.shape === 'pyramid') return labelled(buildPyramidVolumeLesson(poly, scene.size))
  }
  if (kind === 'counts') return buildCountsLesson(poly)
  if (!box) return null
  if (kind === 'diagonal') return labelled(centered(buildDiagonalLesson(box, radius)))
  if (kind === 'shortest-path') return labelled(buildShortestPathLesson(poly, tree, radius), true)
  return null
}

export { LESSON_HINT, LESSON_LABEL, lessonGrade, lessonHint, LESSON_POSE, lessonStepCount, lessonSummary, lessonTabs, type Lesson, type LessonKind, type PiMode } from './data.ts'
