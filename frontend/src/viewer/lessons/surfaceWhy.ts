// 각기둥·각뿔 겉넓이가 왜 그 값인지 (ui.md 겉넓이·부피 공통 흐름, viewer.md "설명 모드"). 좌표는 접힌 입체 기준.
// 각기둥: ① 윗면을 칠한다 (오각형부터는 가운데에서 삼각형으로 나눈다) ② 옆면을 한 띠로 펴서 바닥에 눕힌다. 가로 = 밑면 둘레 (같은 색)
// 각뿔: 옆면 삼각형을 본 뒤 같은 삼각형을 반으로 나눠 양쪽에 붙이면 밑변 × 높이 직사각형이 된다
import * as THREE from 'three'
import type { PolygonSize } from '../../shared/types.ts'
import { thickLine, type Point } from '../curved.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { clamp01, rightTriangleOverlay, textSprite, v3 } from './draw.ts'
import { LENGTH_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'
import { lengthText } from './lengthLabels.ts'
import { faceNormal, stripIndex, surfaceSteps, unrollChain } from './surfaceLayout.ts'

const BASE = '#ffd982'
const SIDE = '#b9dcff'
const INK = '#3c4048'
const AROUND = '#c2255c' // 밑면 둘레 = 옆면 띠의 가로

// areas: 다 편 뒤 면에 남기는 넓이 값. triangle: 삼각기둥 윗면의 직각삼각형 글자 (다 편 뒤에도 그린다)
export function buildPrismSurfaceLesson(poly: Polyhedron, { sides: n, edge: a, height: h }: PolygonSize, areas: { base: string | null; side: string }, triangle?: { edge: string; leg: string; rise: string }): LessonObject {
  const group = new THREE.Group()
  const ring = poly.positions.slice(0, n).map((p): [number, number] => [p[0], p[2]])
  const front = ring[0][1]
  const floor = -h / 2
  const reach = Math.max(n * a, h)
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)

  // 띠를 바닥으로 눕힌다: 앞 옆면의 아래 변을 축으로 돈다
  const tilt = (x: number, y: number, z: number, s: number): Point => {
    const t = (s * Math.PI) / 2
    const [dy, dz] = [y - floor, z - front]
    return [x, floor + dy * Math.cos(t) - dz * Math.sin(t), front + dz * Math.cos(t) + dy * Math.sin(t)]
  }
  const stripAt = (s: number, up: boolean) => unrollChain(ring, s).map(([x, z]) => tilt(x, up ? h / 2 : floor, z, s))
  // 윗면: 앞 옆면의 위 변에 붙어서 띠 너머로 넘어간다
  const topAt = (x: number, z: number, s: number): Point => {
    const t = (s * Math.PI) / 2
    const e = front - z
    return [x, floor + h * Math.cos(t) + e * Math.sin(2 * t), front + h * Math.sin(t) - e * Math.cos(2 * t)]
  }

  const material = (color: string) => own(new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }))
  const [baseMaterial, sideMaterial] = [material('#ffffff'), material('#ffffff')]
  const live = (index: number[], count: number, m: THREE.Material) => {
    const geometry = own(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setIndex(index)
    const mesh = new THREE.Mesh(geometry, m)
    mesh.frustumCulled = false
    group.add(mesh)
    return (points: Point[]) => {
      const pos = geometry.getAttribute('position') as THREE.BufferAttribute
      points.forEach((p, i) => pos.setXYZ(i, ...p))
      pos.needsUpdate = true
      geometry.computeVertexNormals()
    }
  }
  const fan = [...Array(n).keys()].flatMap((k) => [0, k + 1, ((k + 1) % n) + 1])
  const center = ring.reduce((c, p) => [c[0] + p[0] / n, c[1] + p[1] / n], [0, 0])
  live(fan, n + 1, baseMaterial)([[center[0], floor + reach * 0.001, center[1]], ...ring.map(([x, z]): Point => [x, floor + reach * 0.001, z])])
  const setTop = live(fan, n + 1, baseMaterial)
  const setSide = live(stripIndex(n), 2 * (n + 1), sideMaterial)

  const line = (segments: number, radius: number, color: string) => {
    const l = thickLine(segments, radius, own(new THREE.MeshBasicMaterial({ color })))
    own(l.mesh.geometry)
    group.add(l.mesh)
    return l
  }
  const thin = reach * 0.003
  const thick = reach * 0.007
  const inkStrip = line(2 * n + 1, thin, INK) // 면 사이 세로 선까지 한 줄로
  const inkTop = line(n, thin, INK)
  const inkBottom = line(n, thin, INK)
  inkBottom.set([...ring, ring[0]].map(([x, z]): Point => [x, floor, z]))
  const closed = (s: number) => [...ring, ring[0]].map(([x, z]) => topAt(x, z, s))
  const arounds = [line(n, thick, AROUND), line(n, thick, AROUND), line(n, thick, AROUND), line(n, thick, AROUND)]
  arounds[0].set([...ring, ring[0]].map(([x, z]): Point => [x, floor + reach * 0.002, z]))
  const tall = line(1, thick, LENGTH_COLOR.h)

  // 오각형부터: 가운데에서 삼각형으로 나눈다. 한 칸을 칠해 같은 모양임을 보인다
  const cuts = n >= 5 ? line(2 * n, thin * 0.8, INK) : null
  cuts?.set([...Array(2 * n + 1).keys()].map((i): Point => (i % 2 ? topAt(center[0], center[1], 0) : topAt(...ring[(i / 2) % n], 0))))
  const wedgeMaterial = own(new THREE.MeshBasicMaterial({ color: '#ffb74d', side: THREE.DoubleSide }))
  const wedge = cuts
    ? new THREE.Mesh(own(new THREE.BufferGeometry().setFromPoints([topAt(center[0], center[1], 0), topAt(...ring[0], 0), topAt(...ring[1], 0)].map(([x, y, z]) => new THREE.Vector3(x, y + reach * 0.002, z)))), wedgeMaterial)
    : null
  if (wedge) group.add(wedge)

  const sprites: ReturnType<typeof textSprite>[] = []
  const label = (text: string, at: Point) => {
    const s = textSprite(text, reach * (text.length > 6 ? 0.26 : 0.14))
    s.sprite.position.set(...at)
    group.add(s.sprite)
    sprites.push(s)
    return s.sprite
  }
  const flatBottom = stripAt(1, false)
  const flatTop = stripAt(1, true)
  const edgeLabel = label(lengthText(a), [(ring[0][0] + ring[1][0]) / 2, h / 2 + reach * 0.02, front + reach * 0.04])
  const aroundLabel = label(lengthText(n * a), [(flatBottom[0][0] + flatBottom[n][0]) / 2, floor + reach * 0.02, front + reach * 0.05])
  const flatCenter = (flatBottom[0][0] + flatBottom[n][0]) / 2
  const sideArea = label(`옆면 ${areas.side}`, [flatCenter, floor + reach * 0.02, front + h / 2])
  const flatTopCenter = topAt(center[0], center[1], 1)
  const areaLabels = [sideArea]
  if (areas.base) {
    areaLabels.push(label(`밑면 ${areas.base}`, [center[0], floor + reach * 0.02, center[1]]))
    if (!triangle) areaLabels.push(label(`밑면 ${areas.base}`, [flatTopCenter[0], floor + reach * 0.02, flatTopCenter[2]]))
  }
  // 삼각기둥: 앞에서 구한 직각삼각형을 펼친 윗면에 다시 그린다
  const topLeg = surfaceSteps(poly).find((step) => poly.faces[step.face].vertices.length === 3)
  const onFlatTop = (p: number[]) => new THREE.Vector3(...topAt(p[0], p[2], 1)).setY(floor + reach * 0.004)
  const flatTriangle = triangle && topLeg
    ? rightTriangleOverlay(group, { foot: onFlatTop(topLeg.legs[1].from), end: onFlatTop(topLeg.legs[0].to), top: onFlatTop(topLeg.legs[1].to), out: new THREE.Vector3(0, reach * 0.02, 0), reach: a * 0.7, edgeFirst: true, text: triangle })
    : null
  const tallLabel = label(lengthText(h), [flatBottom[n][0] + reach * 0.07, floor + reach * 0.02, (flatBottom[n][2] + flatTop[n][2]) / 2])

  const [white, base, side] = ['#ffffff', BASE, SIDE].map((c) => new THREE.Color(c))
  const apply = (progress: number) => {
    const [q1, q2] = [0, 1].map((k) => clamp01(progress * 2 - k))
    baseMaterial.color.copy(white).lerp(base, clamp01(q1 / 0.3))
    sideMaterial.color.copy(white).lerp(side, clamp01(q2 / 0.15))
    const s = clamp01((q2 - 0.15) / 0.55)
    const [bottom, top] = [stripAt(s, false), stripAt(s, true)]
    setSide([...bottom, ...top])
    setTop([topAt(center[0], center[1], s), ...ring.map(([x, z]) => topAt(x, z, s))])
    inkStrip.set([...bottom.keys()].flatMap((i) => (i % 2 ? [top[i], bottom[i]] : [bottom[i], top[i]])))
    inkTop.set(closed(s))
    const parting = q1 > 0.3 && q2 <= 0
    if (cuts) cuts.mesh.visible = parting
    if (wedge) wedge.visible = parting
    edgeLabel.visible = q1 >= 0.6 && q2 <= 0
    // 같은 길이는 같은 색: 밑면 둘레, 윗면 둘레, 띠의 위아래 변
    for (const l of arounds) l.mesh.visible = q2 > 0
    arounds[1].set(closed(s))
    arounds[2].set(bottom)
    arounds[3].set(top)
    const spread = q2 >= 0.7
    tall.mesh.visible = spread
    tall.set([bottom[n], top[n]])
    aroundLabel.visible = spread
    tallLabel.visible = spread
    for (const l of areaLabels) l.visible = spread
    flatTriangle?.show(spread ? 1 : 0)
  }
  apply(0)

  const radius = Math.max(...ring.map(([x, z]) => Math.hypot(x, z)))
  return {
    group,
    hideSolid: true,
    bounds: new THREE.Box3(new THREE.Vector3(-(n * a) / 2 - reach * 0.1, floor, -radius), new THREE.Vector3((n * a) / 2 + reach * 0.1, h / 2, front + h + 2 * radius)),
    apply,
    dispose() {
      sprites.forEach((s) => s.dispose())
      flatTriangle?.dispose()
      group.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
  }
}

// 각뿔: 옆면 삼각형 묶음의 차례에 같은 삼각형을 반으로 나눠 양쪽 빈 곳에 붙인다. 앞에서 내려와 붙고, 다음 묶음이 시작하면 사라진다
export function withTriangleCopy(lesson: LessonObject, poly: Polyhedron): LessonObject {
  const steps = surfaceSteps(poly)
  const k = steps.findIndex((s) => poly.faces[s.face].vertices.length === 3)
  if (k < 0) return lesson
  const step = steps[k]
  const [a, b] = [v3(step.legs[0].from), v3(step.legs[0].to)]
  const [foot, top] = [v3(step.legs[1].from), v3(step.legs[1].to)]
  const up = top.clone().sub(foot)
  const normal = v3(faceNormal(poly, step.face))
  const material = new THREE.MeshBasicMaterial({ color: '#ffb74d', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  const halves = [a, b].map((corner) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([corner, corner.clone().add(up), top])
    const edges = new THREE.EdgesGeometry(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.add(new THREE.LineSegments(edges, lineMaterial))
    lesson.group.add(mesh)
    return { mesh, geometry, edges }
  })
  const lift = up.length() * 0.6
  const apply = (progress: number) => {
    lesson.apply(progress)
    const q = clamp01(progress * steps.length - k)
    const next = clamp01(progress * steps.length - k - 1)
    const t = clamp01((q - 0.3) / 0.25)
    halves.forEach(({ mesh }, i) => {
      mesh.visible = t > 0 && next <= 0
      mesh.position.copy(normal).multiplyScalar(lift * (1 - clamp01(t * 2 - i))) // 하나씩 내려와 붙는다
    })
  }
  apply(0)
  return {
    ...lesson,
    apply,
    dispose() {
      for (const { mesh, geometry, edges } of halves) {
        mesh.removeFromParent()
        geometry.dispose()
        edges.dispose()
      }
      material.dispose()
      lineMaterial.dispose()
      lesson.dispose()
    },
  }
}
