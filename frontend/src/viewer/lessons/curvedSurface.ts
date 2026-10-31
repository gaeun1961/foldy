// 원기둥·원뿔 겉넓이 (ui.md 공식 시각화 규칙, viewer.md "곡면 도형"). 바로 세운 입체에서 시작한다.
// 원기둥: 밑면 → 옆면이 펼쳐져 직사각형. 원뿔: 밑면 → 옆면이 펼쳐져 부채꼴 → 반지름이 모선인 큰 원의 나머지를 채워 비율을 보인다.
// 같은 길이는 같은 색: 밑면 둘레 = 옆면 가로(호). 글 없이 색만으로 보인다. 3D 라벨은 값만, 식은 왼쪽 쪽에.
// 펼치기는 접기와 같은 계산이다 (curved.ts, 길이가 늘거나 줄지 않는다). 밑면은 바닥에 남고, 좌표는 밑면 가운데가 원점
import * as THREE from 'three'
import type { RoundSize } from '../../shared/types.ts'
import { fanIndex, gridIndex, sidePoint, thickLine, topDiscPoint, type CurvedShape, type Point } from '../curved.ts'
import { clamp01, growingTube, textSprite } from './draw.ts'
import { LENGTH_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'
import { lengthText, piValue, slantText, type PiMode } from './lengthLabels.ts'

const ARC = 96
const BASE_COLOR = '#f8df8e'
const SIDE_COLOR = '#f8df8e'
const PASSED = '#e9e2d3' // 지나간 면
const INK = '#2f2a25'
const AROUND = '#e0442e' // 밑면 둘레 = 옆면 가로(호)
const TALL = LENGTH_COLOR.h // 높이
const RADIUS = LENGTH_COLOR.r // 반지름

// 정점이 움직이는 면 (안팎 한 재질)
function liveMesh(index: number[], count: number, material: THREE.Material) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setIndex(index)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.frustumCulled = false
  const set = (points: Point[]) => {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    points.forEach((p, i) => pos.setXYZ(i, p[0], p[1], p[2]))
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  }
  return { mesh, set }
}

export function buildCurvedSurfaceLesson(shape: CurvedShape, size: RoundSize, pi: PiMode = 'pi'): LessonObject {
  const { radius: r, height: h } = size
  const L = Math.hypot(r, h)
  const cone = shape === 'cone'
  const half = (Math.PI * r) / L // 부채꼴 반각
  const extent = cone ? 2 * L + 2 * r : Math.max(2 * Math.PI * r, h + 4 * r)
  const stepCount = cone ? 3 : 2
  const group = new THREE.Group()
  const face = (color: string) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
  const [baseMaterial, sideMaterial] = [face('#faf6ee'), face('#faf6ee')]
  const inkMaterial = new THREE.MeshBasicMaterial({ color: INK })
  const aroundMaterial = new THREE.MeshBasicMaterial({ color: AROUND })
  const tallMaterial = new THREE.MeshBasicMaterial({ color: cone ? LENGTH_COLOR.l : TALL }) // 공식의 l, h 와 같은 색
  const radiusMaterial = new THREE.MeshStandardMaterial({ color: RADIUS })
  const [white, baseColor, sideColor, passed] = ['#faf6ee', BASE_COLOR, SIDE_COLOR, PASSED].map((c) => new THREE.Color(c))
  const thin = extent * 0.0025
  const thick = extent * 0.006
  const addLine = (segments: number, radius: number, material: THREE.Material, points: (s: number) => Point[]) => {
    const line = thickLine(segments, radius, material)
    group.add(line.mesh)
    return { mesh: line.mesh, set: (s: number) => line.set(points(s)) }
  }
  const range = (n: number) => [...Array(n + 1).keys()]
  // 옆면 위 점: u 는 둘레 방향 0~1, w 는 세로 0(밑면 쪽)~1
  const at = (u: number, w: number, s: number) => sidePoint(shape, size, u, w, s)
  const circle = (y: number) => range(ARC).map((i): Point => [r * Math.cos((i / ARC) * 2 * Math.PI), y, r * Math.sin((i / ARC) * 2 * Math.PI)])

  // 밑면: 바닥에 그대로. 두 밑면은 같은 색, 같은 테두리
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(r, ARC).rotateX(-Math.PI / 2).translate(0, extent * 0.001, 0), baseMaterial)
  group.add(bottom)
  // 옆면
  const side = liveMesh(gridIndex(1, ARC), 2 * (ARC + 1), sideMaterial)
  group.add(side.mesh)
  const sidePoints = (s: number) => [1, 0].flatMap((w) => range(ARC).map((i) => at(i / ARC, w, s)))
  // 윗면 (원기둥): 옆면 위쪽 변에 붙어서 같이 움직인다
  const top = cone ? null : liveMesh(fanIndex(ARC, 1), ARC + 2, baseMaterial)
  if (top) group.add(top.mesh)
  const topRim = (s: number) => range(ARC).map((i) => topDiscPoint(size, i / ARC, 1, s))

  const lines = [
    addLine(ARC, thin, inkMaterial, () => circle(0)),
    addLine(ARC, thin, inkMaterial, (s) => range(ARC).map((i) => at(i / ARC, 0, s))),
    addLine(8, thin, inkMaterial, (s) => range(8).map((j) => at(0, j / 8, s))),
    addLine(8, thin, inkMaterial, (s) => range(8).map((j) => at(1, j / 8, s))),
    ...(cone ? [] : [addLine(ARC, thin, inkMaterial, (s) => range(ARC).map((i) => at(i / ARC, 1, s))), addLine(ARC, thin, inkMaterial, topRim)]),
  ]
  // 같은 길이는 같은 색: 밑면 둘레와 펼친 옆면의 가로(호)
  const aroundMarks = [
    addLine(ARC, thick, aroundMaterial, () => circle(extent * 0.001)),
    addLine(ARC, thick, aroundMaterial, (s) => range(ARC).map((i) => at(i / ARC, 0, s))),
    ...(cone ? [] : [addLine(ARC, thick, aroundMaterial, topRim), addLine(ARC, thick, aroundMaterial, (s) => range(ARC).map((i) => at(i / ARC, 1, s)))]),
  ]
  const edgeMark = addLine(8, thick, tallMaterial, (s) => range(8).map((j) => at(1, j / 8, s)))
  // 반지름은 잘 보이는 쪽에: 원기둥은 윗면, 원뿔은 윗면이 없어서 밑면
  const legY = cone ? extent * 0.002 : h + extent * 0.002
  const radiusLeg = growingTube(new THREE.Vector3(0, legY, 0), new THREE.Vector3(r, legY, 0), thick, radiusMaterial)
  group.add(radiusLeg.mesh)

  // 3D 라벨은 값만
  const sprites: ReturnType<typeof textSprite>[] = []
  const label = (text: string, pos: Point, color?: string) => {
    const s = textSprite(text, extent * 0.14, false, color)
    s.sprite.position.set(...pos)
    s.sprite.visible = false
    group.add(s.sprite)
    sprites.push(s)
    return s.sprite
  }
  const flatEdge = at(1, 0.5, 1)
  const flatArc = at(0.5, 0, 1)
  const apexFlat = at(0.5, 1, 1)
  const radiusLabel = label(lengthText(r), [r / 2, legY + extent * 0.02, r * 0.3], RADIUS)
  const arcLabel = label(`${piValue(2 * r, pi)} cm`, [flatArc[0] + r + extent * 0.09, extent * 0.02, flatArc[2] + extent * 0.03], AROUND)
  const edgeLabel = label(`${cone ? slantText(r, h) : +h.toFixed(2)} cm`, [flatEdge[0] + extent * 0.08, extent * 0.02, flatEdge[2]], cone ? LENGTH_COLOR.l : TALL)

  // 원뿔: 반지름이 모선인 큰 원과 그 나머지
  let bigCircle: THREE.Line | null = null
  let rest: THREE.Mesh | null = null
  const owned: THREE.BufferGeometry[] = []
  const dashed = new THREE.LineDashedMaterial({ color: INK, dashSize: extent * 0.02, gapSize: extent * 0.012 })
  const restMaterial = new THREE.MeshBasicMaterial({ color: SIDE_COLOR, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
  const REST = 96
  if (cone) {
    const y = extent * 0.0015
    const onCircle = (f: number) => new THREE.Vector3(apexFlat[0] + L * Math.sin(f), y, apexFlat[2] + L * Math.cos(f))
    const ring = new THREE.BufferGeometry().setFromPoints(range(ARC).map((i) => onCircle((i / ARC) * 2 * Math.PI)))
    bigCircle = new THREE.Line(ring, dashed).computeLineDistances()
    group.add(bigCircle)
    // 큰 원의 나머지: 부채꼴 끝에서 시작해 한 바퀴를 채운다
    const center = new THREE.Vector3(apexFlat[0], y, apexFlat[2])
    const fan = new THREE.BufferGeometry().setFromPoints(range(REST - 1).flatMap((i) => [center, onCircle(half + (i / REST) * (2 * Math.PI - 2 * half)), onCircle(half + ((i + 1) / REST) * (2 * Math.PI - 2 * half))]))
    rest = new THREE.Mesh(fan, restMaterial)
    group.add(rest)
    owned.push(ring, fan)
  }

  const apply = (progress: number) => {
    const qs = [...Array(stepCount).keys()].map((k) => clamp01(progress * stepCount - k))
    const [q1, q2, q3 = 0] = qs
    // 밑면
    baseMaterial.color.copy(white).lerp(baseColor, clamp01(q1 / 0.3)).lerp(passed, clamp01(q2 / 0.15))
    radiusLeg.grow(q2 > 0 ? 0 : clamp01((q1 - 0.3) / 0.3))
    radiusLabel.visible = q2 <= 0 && q1 >= 0.6
    // 옆면: 칠하고 → 펼친다 (s = 1 이 평면)
    sideMaterial.color.copy(white).lerp(sideColor, clamp01(q2 / 0.15))
    const s = clamp01((q2 - 0.15) / 0.55)
    side.set(sidePoints(s))
    if (top) top.set([topDiscPoint(size, 0, 0, s), ...topRim(s)])
    for (const line of lines) line.set(s)
    for (const mark of aroundMarks) {
      mark.mesh.visible = q2 > 0
      if (q2 > 0) mark.set(s)
    }
    const spread = q2 >= 0.7
    edgeMark.mesh.visible = spread
    if (spread) edgeMark.set(s)
    arcLabel.visible = spread
    edgeLabel.visible = spread
    // 원뿔: 큰 원의 나머지를 채워 비율을 보인다
    if (bigCircle && rest) {
      bigCircle.visible = q3 > 0
      rest.visible = q3 > 0
      rest.geometry.setDrawRange(0, Math.ceil(clamp01(q3 / 0.6) * REST) * 3)
    }
  }
  apply(0)

  const backZ = cone ? -(2 * L + r) : -(h + 3 * r)
  const wide = cone ? L : Math.max(Math.PI * r, r)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-wide, 0, backZ), new THREE.Vector3(wide, h, r)),
    apply,
    dispose() {
      sprites.forEach((x) => x.dispose())
      group.removeFromParent()
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      owned.forEach((g) => g.dispose())
      for (const m of [baseMaterial, sideMaterial, inkMaterial, aroundMaterial, tallMaterial, radiusMaterial, dashed, restMaterial]) m.dispose()
    },
  }
}
