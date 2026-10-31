import * as THREE from 'three'
import type { ShapeScene } from '../../shared/types.ts'
import type { FaceTree } from '../faceTree.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { boxCenterOf, boxSizeOf, lessonStepCount, planOf, type LessonKind } from './data.ts'
import { buildEdgeRelationsLesson } from './edgeRelations.ts'
import { buildDiagonalLesson, buildShortestPathLesson } from './pythagoras.ts'
import { buildSimilarLesson } from './similar.ts'
import { buildSurfaceAreaLesson } from './surfaceArea.ts'
import { buildVolumeLesson } from './volume.ts'
import { withCubeSplit } from './whyThird.ts'
import { DONE, textSprite, v3 } from './draw.ts'
import { boxLengthLabels, lengthText, solidLengthLabels, type LengthLabel } from './lengthLabels.ts'
import { buildSimilarSolidLesson } from './similarSolid.ts'
import { buildCountsLesson } from './counts.ts'
import { prismBasePoints, pyramidPoints, withPythagorasStep } from './pythagorasStep.ts'
import { prismAreaTexts, slantPlan } from './regularLayout.ts'
import { buildRegularSurfaceLesson, buildRegularVolumeLesson } from './regularMeasure.ts'
import { surfaceSteps } from './surfaceLayout.ts'
import { buildPrismSurfaceLesson, withTriangleCopy } from './surfaceWhy.ts'
import { LENGTH_COLOR } from './formulas.ts'
import { withEndLines, type LengthLine } from './lengthLines.ts'
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
  hideSolid?: boolean // 면 트리를 숨긴다: 설명이 입체를 직접 그린다 (각기둥 옆면 펴기)
  setLayers?(layers: number): void // 원뿔 계단의 원판 수 (물체를 다시 만들지 않아서 카메라가 그대로다)
  setCut?(cut: number): void // 구 단면 비교의 자르는 높이 h ÷ r (마찬가지)
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
  // 모서리 길이 글자 (viewer.md "모서리 길이 표시"). 설명 물체에 붙인다. 설명을 끄면 같이 지운다
  const size = box ? Math.max(box.width, box.depth, box.height) : Math.max(...poly.positions.flatMap((p) => p.map(Math.abs))) * 1.6
  // 결과의 공식 글자와 같은 색의 길이 선 (lengthLines.ts). 상자는 앞 오른쪽 아래 모서리에서 a 가로, b 세로, c 높이. 각기둥은 h
  const lineRadius = size * 0.012
  const lengthLines = (): LengthLine[] => {
    if (box) {
      const [w, h, d] = [box.width / 2, box.height / 2, box.depth / 2]
      const corner = new THREE.Vector3(w, -h, d)
      const a = { from: new THREE.Vector3(-w, -h, d), to: corner, color: LENGTH_COLOR.a }
      if (scene.shape === 'cube') return [a]
      return [a, { from: corner, to: new THREE.Vector3(w, -h, -d), color: LENGTH_COLOR.b }, { from: corner, to: new THREE.Vector3(w, h, d), color: LENGTH_COLOR.c }]
    }
    if (scene.shape === 'prism') return [{ from: v3(poly.positions[0]), to: v3(poly.positions[scene.size.sides]), color: LENGTH_COLOR.h }]
    return []
  }
  // show: 그 글자가 지금 필요한가 (ui.md 공식 시각화 규칙 5)
  const labelled = (lesson: LessonObject, labels: LengthLabel[], show: (label: LengthLabel, k: number, progress: number) => boolean) => {
    const sprites = labels.map((l) => {
      const s = textSprite(l.text, size * 0.3)
      s.sprite.position.copy(v3(l.at))
      lesson.group.add(s.sprite)
      return s
    })
    const apply = lesson.apply
    lesson.apply = (progress) => {
      apply(progress)
      sprites.forEach((s, k) => (s.sprite.visible = show(labels[k], k, progress)))
    }
    lesson.apply(0)
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
    if (plan) {
      const leg = surfaceSteps(poly)[0].legs[0]
      return withEndLines(buildRegularSurfaceLesson(poly, plan), plan.height ? [{ from: v3(leg.from), to: v3(leg.to), color: LENGTH_COLOR.a }] : [], lineRadius)
    }
    // 재는 선도 공식 글자와 같은 색 (같은 길이면 뒤의 색)
    const colors = new Map<string, string>()
    if (box) [[box.width, LENGTH_COLOR.a], [box.depth, LENGTH_COLOR.b], [box.height, LENGTH_COLOR.c]].forEach(([n, color]) => colors.set((n as number).toFixed(4), color as string))
    if (scene.shape === 'cube') colors.set(scene.size.edge.toFixed(4), LENGTH_COLOR.a)
    const slant = slantPlan(scene)
    if (scene.shape === 'prism') {
      const { sides, edge, height } = scene.size
      const lesson = buildPrismSurfaceLesson(poly, scene.size, prismAreaTexts(sides, edge, height), slant ? { edge: slant.edge, leg: slant.leg, rise: slant.rise } : undefined)
      return slant ? withPythagorasStep(lesson, 2, slant, prismBasePoints(poly), 2) : lesson // 옆면을 펴면 윗면이 움직여서 그 전까지
    }
    if (scene.shape === 'pyramid') {
      // 옆면 높이는 피타고라스 단계의 빗변과 같은 색
      const steps = surfaceSteps(poly)
      const side = steps.find((s) => poly.faces[s.face].vertices.length === 3)
      if (side) colors.set(side.legs[1].length.toFixed(4), LENGTH_COLOR.l)
      // 피타고라스 단계의 밑변·옆면 높이 글자가 끝까지 남으니 또 쓰지 않는다
      const written = new Set(slant && side ? [side.legs[1].length.toFixed(4), side.legs[0].length.toFixed(4)] : [])
      const lesson = withTriangleCopy(centered(buildSurfaceAreaLesson(poly, [-x, -y, -z], false, colors, written)), poly)
      return slant ? withPythagorasStep(lesson, steps.length, slant, pyramidPoints(poly)) : lesson
    }
    return withEndLines(centered(buildSurfaceAreaLesson(poly, [-x, -y, -z], !!box, colors)), lengthLines(), lineRadius)
  }
  if (kind === 'edge-relations') return buildEdgeRelationsLesson(poly, radius)
  if (kind === 'similar') return box ? centered(buildSimilarLesson(box, scale, radius)) : buildSimilarSolidLesson(poly, scale, radius)
  if (kind === 'volume') {
    const volume = planOf(scene)?.volume
    if (volume) return buildRegularVolumeLesson(poly, volume)
    // 밑면을 칠하면 밑면 길이, 다 쌓으면 높이
    const baseDone = (progress: number) => progress * lessonStepCount(scene, 'volume') >= 1 - 1e-6
    if (box) {
      const labels = scene.shape === 'cube' ? boxLengthLabels(box).slice(0, 1) : boxLengthLabels(box)
      return withEndLines(labelled(centered(buildVolumeLesson(box, radius)), labels, (_, k, p) => (scene.shape !== 'cube' && k === 2 ? p >= DONE : baseDone(p))), lengthLines(), lineRadius)
    }
    if (scene.shape === 'prism') {
      // 다 쌓으면 높이, 맨 위 면을 볼 때 밑면 한 변 (삼각기둥은 직각삼각형에 값이 있다)
      const heightText = lengthText(scene.size.height)
      const steps = lessonStepCount(scene, 'volume')
      const slant = slantPlan(scene)
      const triangle = slant ? { ...prismBasePoints(poly), text: { edge: slant.edge, leg: slant.leg, rise: slant.rise } } : undefined
      const labels = solidLengthLabels(poly).filter((l) => !slant || l.text === heightText)
      return withEndLines(labelled(buildPrismVolumeLesson(poly, scene.size, triangle), labels, (l, _, p) => (l.text === heightText ? p * steps >= steps - 1 - 1e-6 : p * steps > steps - 1 + 1e-6)), lengthLines(), lineRadius)
    }
    if (scene.shape === 'pyramid') {
      const pour = buildPyramidVolumeLesson(poly, scene.size)
      return scene.size.sides === 4 ? withCubeSplit(pour, scene.size.height) : pour // 정육면체는 사각뿔로만 나뉜다
    }
  }
  if (kind === 'counts') return buildCountsLesson(poly)
  if (!box) return null
  // 밑면 삼각형에 가로·세로, 세운 삼각형에 높이
  if (kind === 'diagonal') return labelled(centered(buildDiagonalLesson(box, radius)), boxLengthLabels(box), (_, k, p) => (k === 2 ? p * 3 > 1 + 1e-6 : p > 0))
  if (kind === 'shortest-path') return buildShortestPathLesson(poly, tree, radius)
  return null
}

export { CONE_THIRD_LINK, LESSON_HINT, LESSON_LABEL, lessonGrade, lessonHint, lessonNote, LESSON_POSE, lessonStepCount, lessonSummary, lessonTabs, type Lesson, type LessonKind, type PiMode } from './data.ts'
