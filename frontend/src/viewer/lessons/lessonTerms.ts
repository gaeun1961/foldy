// 용어 (ui.md "용어"): 설명이 끝나면 결과 도형 위에 그 결과에 해당하는 용어를 띄운다. 좌표는 그 설명의 물체 기준 (index.ts, curvedLessons.ts 등)
import * as THREE from 'three'
import type { RevolutionSize, RoundSize, ShapeScene } from '../../shared/types.ts'
import { sidePoint, topDiscPoint, type CurvedShape } from '../curved.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { boxSizeOf } from './data.ts'
import { DONE, textSprite } from './draw.ts'
import { defaultEdge, edgeRelations } from './edgeRelationsLayout.ts'
import type { LessonObject } from './index.ts'

export type LessonTerm = { word: string; at: [number, number, number] }
const INK = '#6741d9' // 길이 글자와 구분되게

export function polyTerms(scene: ShapeScene, poly: Polyhedron, kind: string): LessonTerm[] {
  const box = boxSizeOf(scene)
  const mid = (a: number, b: number): [number, number, number] => {
    const [p, q] = [poly.positions[a], poly.positions[b]]
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]
  }
  if (kind === 'edge-relations') {
    const { parallel, meet, skew } = edgeRelations(poly, defaultEdge(poly))
    return [
      ...(parallel[0] ? [{ word: '평행', at: mid(...parallel[0]) }] : []),
      ...(meet[0] ? [{ word: '만남', at: mid(...meet[0]) }] : []),
      ...(skew[0] ? [{ word: '꼬인 위치', at: mid(...skew[0]) }] : []),
    ]
  }
  if (box) {
    const [w, h, d] = [box.width / 2, box.height / 2, box.depth / 2]
    const gap = Math.max(w, h, d) * 0.15
    if (kind === 'diagonal') return [{ word: '입체 대각선', at: [0, gap, gap] }]
    if (kind !== 'surface-area' && kind !== 'volume') return []
    return [
      { word: '면', at: [0, h + gap * 0.3, 0] },
      { word: '모서리', at: [0, h + gap, -d] },
      { word: '꼭짓점', at: [-w - gap, h + gap, d] },
    ]
  }
  const ys = poly.positions.map((p) => p[1])
  const [top, floor] = [Math.max(...ys), Math.min(...ys)]
  const reach = Math.max(...poly.positions.map((p) => Math.hypot(p[0], p[2])))
  const front = Math.max(...poly.positions.map((p) => p[2]))
  if (scene.shape === 'prism' && kind === 'volume') {
    return [
      { word: '밑면', at: [0, top + reach * 0.12, 0] },
      { word: '옆면', at: [0, (top + floor) / 2, front + reach * 0.1] },
    ]
  }
  if (scene.shape === 'pyramid' && kind === 'surface-area') {
    return [
      { word: '꼭짓점', at: [0, top + reach * 0.25, 0] },
      { word: '옆면', at: [-reach * 0.55, (top + floor) / 2, front * 0.5] },
      { word: '밑면', at: [-reach * 0.8, floor + reach * 0.05, front + reach * 0.2] },
    ]
  }
  if (scene.shape.startsWith('regular-') && (kind === 'surface-area' || kind === 'counts')) {
    const [a, b] = [poly.faces[0].vertices[0], poly.faces[0].vertices[1]]
    const apex = poly.positions.reduce((best, p) => (p[1] > best[1] ? p : best))
    return [
      { word: '꼭짓점', at: [apex[0], apex[1] + reach * 0.25, apex[2]] },
      { word: '모서리', at: mid(a, b) },
    ]
  }
  return []
}

export function curvedTerms(shape: CurvedShape, size: RoundSize, kind: string): LessonTerm[] {
  const { radius: r, height: h } = size
  const lift = Math.max(r, h) * 0.08
  const flat = (u: number, w: number): [number, number, number] => {
    const [x, , z] = sidePoint(shape, size, u, w, 1)
    return [x, lift, z]
  }
  if (kind === 'surface-area' || kind === 'thread') {
    const terms: LessonTerm[] = [
      { word: '밑면', at: [0, lift, 0] },
      { word: '옆면', at: flat(0.5, 0.6) },
    ]
    if (shape === 'cone') return [...terms, { word: '모선', at: flat(1, 0.6) }]
    const [x, , z] = topDiscPoint(size, 0, 0, 1)
    return [...terms, { word: '밑면', at: [x, lift, z] }]
  }
  if (kind === 'volume' && shape === 'cylinder') {
    return [
      { word: '밑면', at: [-r * 0.4, h + lift * 0.5, 0] },
      { word: '옆면', at: [0, h / 2, r + lift] },
    ]
  }
  return []
}

export function revolutionTerms({ figure, radius: w, height, top = w, gap }: RevolutionSize, kind: string): LessonTerm[] {
  const h = figure === 'semicircle' ? 2 * w : height
  const R = gap + w
  const lift = Math.max(R, h) * 0.08
  if (kind === 'revolve-net') {
    if (figure === 'rectangle') return curvedTerms('cylinder', { radius: w, height: h }, 'surface-area')
    if (figure === 'right-triangle') return curvedTerms('cone', { radius: w, height: h }, 'surface-area')
    if (figure === 'semicircle' || w === top) return []
    // 원뿔대: 큰 원뿔의 옆면에서 위쪽을 뺀 띠 (revolve.ts)
    const [big, small] = [Math.max(w, top), Math.min(w, top)]
    const [x, , z] = sidePoint('cone', { radius: big, height: (h * big) / (big - small) }, 0.5, (1 - small / big) / 2, 1)
    return [{ word: '밑면', at: [0, lift, 0] }, { word: '옆면', at: [x, lift, z] }]
  }
  if (kind !== 'revolve' && kind !== 'revolve-area' && kind !== 'revolve-volume') return []
  if (figure === 'semicircle') return gap > 0 ? [] : [{ word: '구', at: [0, h + lift * 1.5, w * 0.7] }, { word: '반지름', at: [w * 0.5, h / 2, w + lift] }]
  const name = figure === 'rectangle' ? '원기둥' : figure === 'right-triangle' ? '원뿔' : '원뿔대'
  const slopeTop = figure === 'rectangle' ? R : figure === 'right-triangle' ? gap : gap + top
  return [
    ...(gap > 0 ? [] : [{ word: name, at: [-R * 0.6, h + lift * 1.5, 0] as [number, number, number] }]),
    { word: '밑면', at: [0, lift * 0.5, R + lift] },
    { word: '옆면', at: [(R + slopeTop) / 2, h / 2, R * 0.6] },
    { word: '모선', at: [(R + slopeTop) / 2 + lift, h * 0.75, 0] },
  ]
}

// 설명이 끝나면 용어를 보인다. 글자는 lesson.group 에 붙는다
export function withTerms(lesson: LessonObject | null, terms: LessonTerm[], width: number): LessonObject | null {
  if (!lesson || !terms.length) return lesson
  const sprites = terms.map(({ word, at }) => {
    const s = textSprite(word, width, false, INK)
    s.sprite.position.copy(new THREE.Vector3(...at))
    lesson.group.add(s.sprite)
    return s
  })
  const apply = (progress: number) => {
    lesson.apply(progress)
    for (const s of sprites) s.sprite.visible = progress >= DONE
  }
  apply(0)
  return {
    ...lesson,
    apply,
    dispose() {
      sprites.forEach((s) => s.dispose())
      lesson.dispose()
    },
  }
}
