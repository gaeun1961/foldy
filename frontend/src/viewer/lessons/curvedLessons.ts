// 원기둥·원뿔 설명 (docs/specs/viewer.md "설명 모드"). 바로 세운 입체(밑면이 바닥 y = 0, 축이 x = z = 0)에 그린다.
// 겉넓이는 curvedSurface.ts. 부피: 원기둥은 원판을 층층이 쌓고, 원뿔은 같은 밑면·높이의 통에 물을 세 번 붓는다 (각뿔과 같은 방식, pour.ts).
// 닮음: 틀 옆에 밑면 k²장, 작은 도형 k³개를 늘어놓는다. 각뿔과 같은 방식 (similarSolid.ts)
import * as THREE from 'three'
import type { RoundSize } from '../../shared/types.ts'
import type { CurvedShape } from '../curved.ts'
import { clamp01, DONE, growingTube, layerTags, textSprite } from './draw.ts'
import type { LessonKind } from './data.ts'
import type { LessonObject } from './index.ts'
import { lengthText, slantText, type PiMode } from './lengthLabels.ts'
import { withPythagorasStep } from './pythagorasStep.ts'
import { threadPlan } from './regularLayout.ts'
import { buildRevolutionSectionLesson, buildRevolveLesson, type CutKind } from './revolve.ts'
import { buildThreadLesson } from './thread.ts'
import { buildPourLesson } from './pour.ts'
import { buildCurvedSurfaceLesson } from './curvedSurface.ts'
import { layerProgress, pieces, stackProgress } from './volumeLayout.ts'
import { withStairStep } from './whyThird.ts'
import { LENGTH_COLOR } from './formulas.ts'
import { withEndLines } from './lengthLines.ts'
import { curvedTerms, withTerms } from './lessonTerms.ts'

const SEGMENTS = 64
const INK = '#3c4048'
const ACTIVE = '#ffe8a8'
const PIECE = ['#f08c00', '#1c7ed6', '#2f9e44']

// 모양 틀: 위·아래 둘레와 세로 선 넷. y = 0 이 바닥, 축이 원점
export function outline(shape: CurvedShape, r: number, h: number) {
  const pts: THREE.Vector3[] = []
  const rim = (y: number) => {
    for (let i = 0; i < SEGMENTS; i++) {
      const [a, b] = [(i / SEGMENTS) * 2 * Math.PI, ((i + 1) / SEGMENTS) * 2 * Math.PI]
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)), new THREE.Vector3(r * Math.cos(b), y, r * Math.sin(b)))
    }
  }
  rim(0)
  if (shape === 'cylinder') rim(h)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 2 * Math.PI + Math.PI / 4
    pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)), shape === 'cylinder' ? new THREE.Vector3(r * Math.cos(a), h, r * Math.sin(a)) : new THREE.Vector3(0, h, 0))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

// 입체 덩어리. y = 0 이 바닥
const solidMesh = (shape: CurvedShape, r: number, h: number) =>
  (shape === 'cylinder' ? new THREE.CylinderGeometry(r, r, h, SEGMENTS) : new THREE.ConeGeometry(r, h, SEGMENTS)).translate(0, h / 2, 0)

export function buildCurvedLesson(shape: CurvedShape, size: RoundSize, kind: LessonKind, scale: number, pi: PiMode = 'pi', cutKind?: CutKind): LessonObject | null {
  if (kind === 'section') return buildRevolutionSectionLesson({ figure: shape === 'cylinder' ? 'rectangle' : 'right-triangle', radius: size.radius, height: size.height, gap: 0 }, cutKind)
  return withTerms(curvedBody(shape, size, kind, scale, pi), curvedTerms(shape, size, kind), Math.max(2 * size.radius, size.height) * 0.22)
}

function curvedBody(shape: CurvedShape, size: RoundSize, kind: LessonKind, scale: number, pi: PiMode): LessonObject | null {
  if (kind === 'surface-area') {
    // 끝나면 밑면에 반지름 r. 옆면 가로·세로는 펼친 그림의 색이 그대로 공식과 맞는다
    const reachAll = Math.max(2 * size.radius, size.height)
    const lesson = withEndLines(buildCurvedSurfaceLesson(shape, size, pi), [{ from: new THREE.Vector3(0, reachAll * 0.004, 0), to: new THREE.Vector3(size.radius, reachAll * 0.004, 0), color: LENGTH_COLOR.r }], reachAll * 0.012)
    if (shape !== 'cone') return lesson
    // 원뿔: 세운 입체 안에 직각삼각형을 그려 모선을 먼저 구한다
    const plan = { hint: '', edge: `${slantText(size.radius, size.height)} cm`, leg: lengthText(size.radius), rise: lengthText(size.height) }
    const reach = Math.hypot(size.radius, size.height)
    return withPythagorasStep(lesson, 3, plan, { foot: new THREE.Vector3(), end: new THREE.Vector3(size.radius, 0, 0), top: new THREE.Vector3(0, size.height, 0), out: new THREE.Vector3(reach * 0.1, 0, reach * 0.1), reach, edgeColor: LENGTH_COLOR.l }, 2)
  }
  if (kind === 'revolve') return buildRevolveLesson({ figure: shape === 'cylinder' ? 'rectangle' : 'right-triangle', radius: size.radius, height: size.height, gap: 0 })
  if (kind === 'thread' && shape === 'cylinder') {
    const extent = Math.max(2 * size.radius, size.height)
    return withEndLines(buildThreadLesson(size, pi, threadPlan(size.radius, size.height, pi).label), [{ from: new THREE.Vector3(0, extent * 0.004, 0), to: new THREE.Vector3(size.radius, extent * 0.004, 0), color: LENGTH_COLOR.r }], extent * 0.012)
  }
  if (kind === 'volume' && shape === 'cylinder') {
    const { radius: r, height: h } = size
    return withEndLines(stackLesson(size), [{ from: new THREE.Vector3(0, h, 0), to: new THREE.Vector3(r, h, 0), color: LENGTH_COLOR.r }, { from: new THREE.Vector3(r, 0, 0), to: new THREE.Vector3(r, h, 0), color: LENGTH_COLOR.h }], Math.max(2 * r, h) * 0.012)
  }
  if (kind === 'volume') return withStairStep(pourLesson(size), size.radius, size.height, { cone: outline('cone', size.radius, size.height), cup: outline('cylinder', size.radius, size.height) })
  if (kind === 'similar') return similarLesson(shape, size, scale)
  return null
}

// 길이 글자를 만들고 지우는 도우미
function labels(group: THREE.Group, width: number, items: [string, number, number, number][]) {
  return items.map(([text, x, y, z]) => {
    const s = textSprite(text, width)
    s.sprite.position.set(x, y, z)
    group.add(s.sprite)
    return s
  })
}

// 원기둥 부피: 높이 1 짜리 원판을 아래부터 쌓는다
function stackLesson({ radius: r, height: h }: RoundSize): LessonObject {
  const group = new THREE.Group()
  const geometry = new THREE.CylinderGeometry(r, r, 1, SEGMENTS)
  const edges = new THREE.EdgesGeometry(geometry, 30)
  const normal = new THREE.MeshStandardMaterial({ color: '#ffffff' })
  const active = new THREE.MeshStandardMaterial({ color: ACTIVE })
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  // 점선 틀: 시작 전에도 어떤 모양을 채울지 보인다
  const frame = outline('cylinder', r, h)
  const frameMaterial = new THREE.LineDashedMaterial({ color: INK, dashSize: Math.max(2 * r, h) * 0.03, gapSize: Math.max(2 * r, h) * 0.02 })
  group.add(new THREE.LineSegments(frame, frameMaterial).computeLineDistances())
  const layers = pieces(h)
  let y = 0
  const discs = layers.map((sy) => {
    const mesh = new THREE.Mesh(geometry, normal)
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(edges, lineMaterial))
    group.add(mesh)
    const disc = { mesh, sy, y }
    y += sy
    return disc
  })
  const size = Math.max(2 * r, h)
  const [radiusLabel, heightLabel] = labels(group, size * 0.45, [
    [lengthText(r), r / 2, 0, r + size * 0.12],
    [lengthText(h), -r - size * 0.1, h / 2, r * 0.7],
  ])
  // 밑면 (밑넓이): 층을 쌓기 전에 먼저 칠한다
  const baseGeometry = new THREE.CircleGeometry(r, SEGMENTS).rotateX(-Math.PI / 2)
  const baseMaterial = new THREE.MeshBasicMaterial({ color: '#ffb74d', side: THREE.DoubleSide })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = 0.01
  group.add(base)
  const tags = layerTags(group, layers.length, size * 0.16, (k) => new THREE.Vector3(r + size * 0.12, discs[k].y + discs[k].sy / 2, 0))
  const apply = (whole: number) => {
    const { base: painted, layersP: progress } = stackProgress(layers.length, whole)
    base.visible = painted > 0
    radiusLabel.sprite.visible = painted >= 1 // 밑면을 칠하면 반지름, 다 쌓으면 높이
    heightLabel.sprite.visible = whole >= DONE
    const per = layerProgress(layers.length, progress)
    let current = per.findIndex((q) => q > 0 && q < 1)
    if (current < 0 && progress > 0 && progress < 1) current = per.filter((q) => q >= 1).length - 1
    tags.show(current)
    discs.forEach((d, k) => {
      const height = Math.max((d.sy - 0.04) * per[k], 1e-3)
      d.mesh.visible = per[k] > 0
      d.mesh.scale.set(1, height, 1)
      d.mesh.position.y = d.y + height / 2
      d.mesh.material = k === current ? active : normal
    })
  }
  apply(0)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-r, 0, -r), new THREE.Vector3(r, h, r)),
    view: new THREE.Vector3(0.3, 0.88, 1), // 수평에서 40°: 층이 쌓이는 높이가 보이게
    apply,
    dispose() {
      radiusLabel.dispose()
      heightLabel.dispose()
      group.removeFromParent()
      tags.dispose()
      for (const g of [geometry, edges, frame, baseGeometry]) g.dispose()
      for (const m of [normal, active, lineMaterial, frameMaterial, baseMaterial]) m.dispose()
    },
  }
}

// 원뿔 부피: 같은 밑면·높이의 원기둥(통)에 물을 세 번 붓는다 (pour.ts)
function pourLesson({ radius: r, height: h }: RoundSize): LessonObject {
  return buildPourLesson({
    body: solidMesh('cone', r, h),
    bodyEdges: outline('cone', r, h),
    baseY: 0,
    cupFill: new THREE.CylinderGeometry(r, r, 1, SEGMENTS),
    fillHeight: 1,
    cupEdges: outline('cylinder', r, h),
    cupEdgesY: 0,
    rim: [...Array(SEGMENTS).keys()].map((i) => new THREE.Vector3(r * Math.cos((i / SEGMENTS) * 2 * Math.PI), 0, r * Math.sin((i / SEGMENTS) * 2 * Math.PI))),
    cupX: 2 * r + Math.max(r, h) * 0.45,
    radius: r,
    height: h,
    heightLabel: lengthText(h),
  })
}

// 닮음: 작은 도형, k배 틀, 옆에 밑면 k²장·작은 도형 k³개. 단계: 길이 1 + 한 면 1 + 부피 k 층
function similarLesson(shape: CurvedShape, { radius: r, height: h }: RoundSize, k: number): LessonObject {
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const size = Math.max(2 * r, h)
  const gap = size * 0.3
  const lineMaterial = own(new THREE.LineBasicMaterial({ color: INK }))
  const frameGeometry = own(outline(shape, r, h))
  group.add(new THREE.LineSegments(frameGeometry, lineMaterial))
  // 큰 틀: 바닥을 맞추고 오른쪽에
  const bigX = r + gap + k * r
  const big = new THREE.LineSegments(frameGeometry, lineMaterial)
  big.scale.setScalar(k)
  big.position.x = bigX
  group.add(big)
  // ① 길이: 반지름과, 큰 틀의 반지름을 k 조각으로
  const pieceMaterials = PIECE.map((color) => own(new THREE.MeshStandardMaterial({ color })))
  const thick = size * 0.012
  const edge = growingTube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0), thick, pieceMaterials[0])
  own(edge.mesh.geometry)
  const segments = Array.from({ length: k }, (_, i) => {
    const t = growingTube(new THREE.Vector3(bigX + i * r, 0, 0), new THREE.Vector3(bigX + (i + 1) * r, 0, 0), thick, pieceMaterials[i % PIECE.length])
    own(t.mesh.geometry)
    return t
  })
  group.add(edge.mesh, ...segments.map((s) => s.mesh))
  // 늘어놓는 자리: 큰 틀 오른쪽
  const cell = 2 * r * 1.12
  const startX = bigX + k * r + gap + r
  const place = (i: number, layer: number, m: number) => new THREE.Vector3(startX + i * cell, layer * h * 1.12, -m * cell)
  const tileGeometry = own(new THREE.CircleGeometry(r, SEGMENTS).rotateX(-Math.PI / 2))
  const tileMaterial = own(new THREE.MeshStandardMaterial({ color: ACTIVE, side: THREE.DoubleSide }))
  const tiles = Array.from({ length: k * k }, (_, n) => {
    const mesh = new THREE.Mesh(tileGeometry, tileMaterial)
    mesh.position.copy(place(n % k, 0, Math.floor(n / k)))
    group.add(mesh)
    return mesh
  })
  const solidGeometry = own(solidMesh(shape, r, h))
  const normal = own(new THREE.MeshStandardMaterial({ color: '#ffffff' }))
  const active = own(new THREE.MeshStandardMaterial({ color: ACTIVE }))
  const copies = Array.from({ length: k ** 3 }, (_, n) => {
    const layer = Math.floor(n / (k * k))
    const index = n % (k * k)
    const mesh = new THREE.Mesh(solidGeometry, normal)
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(frameGeometry, lineMaterial))
    mesh.position.copy(place(index % k, layer, Math.floor(index / k)))
    group.add(mesh)
    return { mesh, layer, index }
  })
  const midX = startX + ((k - 1) * cell) / 2
  const midZ = (-(k - 1) * cell) / 2
  const tileLabel = textSprite(`${k * k}장`, size * 1.4)
  tileLabel.sprite.position.set(midX, gap, midZ)
  const copyLabel = textSprite(`${k ** 3}개`, size * 1.4)
  copyLabel.sprite.position.set(midX, k * h * 1.12 + gap * 0.4, midZ)
  group.add(tileLabel.sprite, copyLabel.sprite)

  const steps = 2 + k
  const apply = (progress: number) => {
    const q1 = clamp01(progress * steps)
    const q2 = clamp01(progress * steps - 1)
    edge.grow(q1)
    segments.forEach((s, i) => s.grow(clamp01(q1 * k - i)))
    tiles.forEach((t, n) => (t.visible = q2 * tiles.length > n && progress * steps < 2.5))
    tileLabel.sprite.visible = q2 >= 1 && progress * steps < 2.5
    let current = -1
    copies.forEach((c) => {
      const q = clamp01(progress * steps - 2 - c.layer)
      c.mesh.visible = q * (k * k) > c.index
      if (q > 0 && q < 1) current = c.layer
      c.mesh.material = c.layer === current ? active : normal
    })
    copyLabel.sprite.visible = progress >= 1 - 1e-6
  }
  apply(0)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-r, 0, -(k - 1) * cell - r), new THREE.Vector3(startX + (k - 1) * cell + r, Math.max(k * h, k * h * 1.12), Math.max(r, k * r))),
    apply,
    dispose() {
      tileLabel.dispose()
      copyLabel.dispose()
      group.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
  }
}
