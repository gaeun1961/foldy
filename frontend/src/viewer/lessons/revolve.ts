// 회전체 (ui.md 공식 시각화 규칙, viewer.md "회전체"): 평면도형을 축으로 돌리면 입체가 된다.
// 돌리기: progress 가 곧 돌린 각도다 (0 = 0°, 1 = 360°). 세로 단면: 축을 품는 평면으로 자른다. 전개도: 옆면을 편다. 바닥이 y = 0, 축이 x = z = 0
import * as THREE from 'three'
import type { RevolutionSize, RoundSize } from '../../shared/types.ts'
import { fanIndex, gridIndex, sidePoint, thickLine, type Point } from '../curved.ts'
import { buildCurvedSurfaceLesson } from './curvedSurface.ts'
import { clamp01, DONE, growingTube, textSprite } from './draw.ts'
import { LENGTH_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'
import { lengthText } from './lengthLabels.ts'
import { revolutionTerms, withTerms } from './lessonTerms.ts'
import { cutAngle, heightOf, profileOf, reachOf, sectionName, sectionStrips, type CutKind } from './revolveLayout.ts'

export { heightOf, profileOf, sectionName, sectionStrips, type CutKind }

const SEGMENTS = 96
const AXIS = '#2f2a25' // 굵은 잉크: r 의 빨강과 구분
const FLAG = '#f8df8e'
const SWEPT = '#e9e2d3'
const INK = '#2f2a25'
const GAP_COLOR = '#8c8680'

const latheOf = (size: RevolutionSize) => new THREE.LatheGeometry(profileOf(size).map(([x, y]) => new THREE.Vector2(x, y)), SEGMENTS, Math.PI / 2)

export function buildRevolveLesson(size: RevolutionSize): LessonObject {
  const group = new THREE.Group()
  const { figure, radius: w, top = w, gap } = size
  const h = heightOf(size)
  const reach = reachOf(size)
  const span = Math.max(2 * reach, h)
  const profile = profileOf(size)
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const thick = span * 0.012

  // 돌아간 자리: 돌린 각도만큼만 그린다. 면 번호가 각도 순서라 drawRange 로 자른다
  const sweptMaterial = own(new THREE.MeshStandardMaterial({ color: SWEPT, transparent: true, side: THREE.DoubleSide }))
  const sweptGeometry = own(latheOf(size))
  const swept = new THREE.Mesh(sweptGeometry, sweptMaterial)
  swept.castShadow = true
  group.add(swept)
  const faces = sweptGeometry.index!.count

  // 평면도형: +x 쪽 평면에서 축을 돈다. 볼록한 모양이라 가운데에서 부채꼴로 칠한다
  const point = ([x, y]: [number, number]) => new THREE.Vector3(x, y, 0)
  const middle = profile.reduce((c, p) => c.add(point(p)), new THREE.Vector3()).multiplyScalar(1 / profile.length)
  const shapeGeometry = own(new THREE.BufferGeometry().setFromPoints(profile.flatMap((p, i) => [middle, point(p), point(profile[(i + 1) % profile.length])])))
  const lineMaterial = own(new THREE.LineBasicMaterial({ color: INK }))
  const outlineGeometry = own(new THREE.BufferGeometry().setFromPoints([...profile, profile[0]].map(point)))
  const flag = new THREE.Mesh(shapeGeometry, own(new THREE.MeshBasicMaterial({ color: FLAG, side: THREE.DoubleSide })))
  flag.add(new THREE.Line(outlineGeometry, lineMaterial))
  group.add(flag)
  // 처음 자리: 어떤 도형이 돌았는지 남긴다
  const start = new THREE.Line(outlineGeometry, lineMaterial)
  group.add(start)

  const axis = growingTube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h + span * 0.3, 0), thick * 1.4, own(new THREE.MeshBasicMaterial({ color: AXIS })))
  axis.grow(1)
  own(axis.mesh.geometry)
  group.add(axis.mesh)

  // 길이: 공식 글자와 같은 색. 돌린 뒤에도 처음 자리에 남는다
  const sprites: ReturnType<typeof textSprite>[] = []
  const label = (text: string, x: number, y: number, z = 0, color?: string, width = span * 0.26) => {
    const s = textSprite(text, width, false, color)
    s.sprite.position.set(x, y, z)
    group.add(s.sprite)
    sprites.push(s)
  }
  const measure = (a: [number, number], b: [number, number], color: string) => {
    const t = growingTube(point(a), point(b), thick, own(new THREE.MeshBasicMaterial({ color })))
    t.grow(1)
    own(t.mesh.geometry)
    group.add(t.mesh)
  }
  const low = span * 0.004
  measure([gap, low], [gap + w, low], LENGTH_COLOR.r)
  label(lengthText(w), gap + w / 2, 0, span * 0.14, LENGTH_COLOR.r)
  label('회전축', 0, h + span * 0.38, 0, undefined, span * 0.34)
  if (gap > 0) {
    measure([0, low], [gap, low], GAP_COLOR)
    label(lengthText(gap), gap / 2, 0, -span * 0.12)
  }
  if (figure === 'rectangle') {
    measure([gap + w, 0], [gap + w, h], LENGTH_COLOR.h)
    label(lengthText(h), gap + w + span * 0.16, h / 2, 0, LENGTH_COLOR.h)
  }
  if (figure === 'right-triangle' || figure === 'trapezoid') {
    measure([gap + w, 0], [gap + (figure === 'trapezoid' ? top : 0), h], LENGTH_COLOR.l)
    if (gap > 0) measure([gap, 0], [gap, h], LENGTH_COLOR.h)
    label(lengthText(h), gap > 0 ? gap - span * 0.12 : -span * 0.16, h / 2, 0, LENGTH_COLOR.h)
  }
  if (figure === 'trapezoid') {
    measure([gap, h], [gap + top, h], LENGTH_COLOR.r)
    label(lengthText(top), gap + top / 2, h + span * 0.08, 0, LENGTH_COLOR.r)
  }

  // 다 돌리면 둘레 선으로 입체를 또렷하게
  const ringsAt: [number, number][] = figure === 'semicircle' ? [[gap + w, w], ...(gap > 0 ? ([[gap, 0], [gap, h]] as [number, number][]) : [])] : profile.filter(([x]) => x > 0)
  const rings = ringsAt.map(([radius, y]) => {
    const line = new THREE.LineLoop(own(new THREE.BufferGeometry().setFromPoints([...Array(SEGMENTS).keys()].map((i) => new THREE.Vector3(radius * Math.cos((i / SEGMENTS) * 2 * Math.PI), y, radius * Math.sin((i / SEGMENTS) * 2 * Math.PI))))), lineMaterial)
    group.add(line)
    return line
  })

  const apply = (progress: number) => {
    const q = clamp01(progress)
    const done = q >= DONE
    swept.visible = q > 0
    sweptGeometry.setDrawRange(0, Math.floor((q * faces) / 6) * 6)
    sweptMaterial.opacity = done ? 0.92 : 0.45
    sweptMaterial.depthWrite = done
    flag.rotation.y = q * 2 * Math.PI
    flag.visible = !done
    start.visible = !done
    for (const line of rings) line.visible = done
  }
  apply(0)

  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-reach - span * 0.1, 0, -reach), new THREE.Vector3(reach + span * 0.25, h + span * 0.4, reach + span * 0.15)),
    view: new THREE.Vector3(0.3, 0.88, 1), // 수평에서 40°: 축과 높이가 보이게
    apply,
    dispose() {
      sprites.forEach((s) => s.dispose())
      group.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
  }
}

// 입체만 (왼쪽 메뉴를 끈 평소 화면). 곡면 화면의 net 과 같은 모양으로 돌려준다
export function buildRevolutionBody(size: RevolutionSize, material: THREE.Material) {
  const group = new THREE.Group()
  const geometry = latheOf(size)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  group.add(mesh)
  return {
    group,
    apex: null,
    apply: (_s: number) => {},
    setPaired: (_on: boolean) => {},
    dispose() {
      group.removeFromParent()
      geometry.dispose()
    },
  }
}

// 단면: 입체는 연하게, 평면은 반투명으로, 단면은 강조색. 자르는 높이가 바뀌면 단면만 다시 그린다 (setCut)
export function buildRevolutionSectionLesson(size: RevolutionSize, kind: CutKind = 'vertical'): LessonObject {
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const h = heightOf(size)
  const reach = reachOf(size)
  const span = Math.max(2 * reach, h)
  group.add(new THREE.Mesh(own(latheOf(size)), own(new THREE.MeshStandardMaterial({ color: SWEPT, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }))))
  const a = cutAngle(kind)
  const [c, s] = [Math.cos(a), Math.sin(a)]
  const planeMaterial = own(new THREE.MeshBasicMaterial({ color: '#8c8680', transparent: true, side: THREE.DoubleSide, depthWrite: false }))
  // 평면: 기운 방향 d 와 앞뒤 방향 z 로 펼친다
  const [planeU, planeV] = kind === 'vertical' ? [h + span * 0.3, 2 * reach + span * 0.5] : [(2 * reach) / c + span * 0.4, 2 * reach + span * 0.5]
  const plane = new THREE.Mesh(own(new THREE.PlaneGeometry(planeV, planeU)), planeMaterial)
  // 평면의 가로는 x, 세로는 뒤쪽 위로. 앞면이 카메라 쪽을 본다
  const rise = new THREE.Vector3(0, s, -c)
  plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), rise, new THREE.Vector3(1, 0, 0).cross(rise)))
  group.add(plane)
  const faceMaterial = own(new THREE.MeshBasicMaterial({ color: FLAG, transparent: true, side: THREE.DoubleSide, depthWrite: false }))
  const lineMaterial = own(new THREE.LineBasicMaterial({ color: INK }))
  const face = new THREE.Mesh(new THREE.BufferGeometry(), faceMaterial)
  const outline = new THREE.LineSegments(new THREE.BufferGeometry(), lineMaterial)
  group.add(face, outline)
  const axis = growingTube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h + span * 0.2, 0), span * 0.012, own(new THREE.MeshBasicMaterial({ color: AXIS })))
  axis.grow(1)
  own(axis.mesh.geometry)
  group.add(axis.mesh)

  let cut = 0.5
  let shown = 0
  let nameLabel: ReturnType<typeof textSprite> | null = null
  const place = () => {
    const y0 = kind === 'vertical' ? 0 : clamp01(cut) * h
    const lift = new THREE.Vector3(0, c, s).multiplyScalar(span * 0.002)
    const at = (u: number, v: number) => new THREE.Vector3(v, y0 + u * s, -u * c).add(lift)
    const faces: THREE.Vector3[] = []
    const lines: THREE.Vector3[] = []
    const strips = sectionStrips(size, kind, cut)
    strips.forEach(({ u, spans }, i) => {
      const next = strips[i + 1]
      if (!next) return
      // 앞뒤 띠의 구간 수가 같으면 잇고, 끝 변도 선으로 잇는다. 구간이 시작하거나 끝나는 곳은 닫는다
      if (next.spans.length === spans.length) {
        spans.forEach(([v0, v1], k) => {
          const [n0, n1] = next.spans[k]
          faces.push(at(u, v0), at(next.u, n0), at(next.u, n1), at(u, v0), at(next.u, n1), at(u, v1))
          lines.push(at(u, v0), at(next.u, n0), at(u, v1), at(next.u, n1))
        })
      } else {
        for (const [p, list] of [[u, spans], [next.u, next.spans]] as const) for (const [v0, v1] of list) lines.push(at(p, v0), at(p, v1))
      }
    })
    for (const end of [strips[0], strips[strips.length - 1]]) for (const [v0, v1] of end.spans) lines.push(at(end.u, v0), at(end.u, v1))
    face.geometry.dispose()
    outline.geometry.dispose()
    face.geometry = new THREE.BufferGeometry().setFromPoints(faces)
    outline.geometry = new THREE.BufferGeometry().setFromPoints(lines)
    // 평면 가운데: 세로는 도형 가운데 높이, 가로·비스듬히는 자르는 높이
    plane.position.set(0, kind === 'vertical' ? h / 2 : y0, 0)
    // 단면 모양의 이름을 단면 위에
    nameLabel?.dispose()
    nameLabel?.sprite.removeFromParent()
    nameLabel = null
    const name = sectionName(size, kind, cut)
    if (name) {
      nameLabel = textSprite(name, span * (name.length > 5 ? 0.5 : 0.28), name.length > 5, '#2f2a25')
      nameLabel.sprite.position.set(0, kind === 'vertical' ? h / 2 : y0 + span * 0.04, span * 0.04)
      nameLabel.sprite.visible = shown >= 1
      group.add(nameLabel.sprite)
    }
  }
  place()

  const apply = (progress: number) => {
    const q = clamp01(progress)
    planeMaterial.opacity = 0.25 * clamp01(q / 0.3)
    plane.visible = q > 0
    faceMaterial.opacity = clamp01((q - 0.3) / 0.5)
    face.visible = q > 0.3
    outline.visible = q > 0.3
    shown = q
    if (nameLabel) nameLabel.sprite.visible = q >= 1
  }
  apply(0)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-reach - span * 0.25, 0, -reach), new THREE.Vector3(reach + span * 0.25, h + span * 0.25, reach)),
    view: new THREE.Vector3(0.15, kind === 'vertical' ? 0.5 : 1.1, 1), // 세로는 앞에서, 가로·비스듬히는 위에서 단면이 보이게
    setCut(next) {
      if (next === cut) return
      cut = next
      place()
    },
    apply,
    dispose() {
      nameLabel?.dispose()
      group.removeFromParent()
      face.geometry.dispose()
      outline.geometry.dispose()
      owned.forEach((x) => x.dispose())
    },
  }
}

// 전개도: 원기둥·원뿔은 겉넓이 설명의 펼치기를, 원뿔대는 큰 원뿔의 옆면에서 위쪽을 뺀 띠를 편다. 축에 붙은 도형만
export function buildRevolutionNetLesson(size: RevolutionSize): LessonObject {
  const { figure, radius: w, height: h, top = w } = size
  if (figure === 'rectangle' || figure === 'right-triangle') {
    const shape = figure === 'rectangle' ? 'cylinder' : 'cone'
    const base = buildCurvedSurfaceLesson(shape, { radius: w, height: h })
    const [from, to] = shape === 'cone' ? [1 / 3, 2 / 3] : [1 / 2, 1]
    const apply = (progress: number) => base.apply(from + clamp01(progress) * (to - from))
    apply(0)
    return { ...base, apply }
  }
  // 원뿔대: 아랫변 R, 윗변 r. 큰 원뿔 높이 H = h × R / (R − r)
  const [R, r] = [Math.max(w, top), Math.min(w, top)]
  const cone: RoundSize = { radius: R, height: R === r ? h : (h * R) / (R - r) }
  const shape = R === r ? 'cylinder' : 'cone'
  const upTo = R === r ? 1 : 1 - r / R // sidePoint 의 w 로 윗변까지
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const L = Math.hypot(R, cone.height)
  const extent = 2 * L + 2 * R
  const face = (color: string) => own(new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }))
  const [baseMaterial, sideMaterial] = [face('#f8df8e'), face(SWEPT)]
  group.add(new THREE.Mesh(own(new THREE.CircleGeometry(R, SEGMENTS).rotateX(-Math.PI / 2).translate(0, extent * 0.001, 0)), baseMaterial))
  const live = (index: number[], count: number, material: THREE.Material) => {
    const geometry = own(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setIndex(index)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    group.add(mesh)
    return (points: Point[]) => {
      const pos = geometry.getAttribute('position') as THREE.BufferAttribute
      points.forEach((p, i) => pos.setXYZ(i, ...p))
      pos.needsUpdate = true
      geometry.computeVertexNormals()
    }
  }
  const rows = 8
  const range = (n: number) => [...Array(n + 1).keys()]
  const at = (u: number, v: number, s: number) => sidePoint(shape, cone, u, v, s)
  const setSide = live(gridIndex(rows, SEGMENTS), (rows + 1) * (SEGMENTS + 1), sideMaterial)
  const setTop = live(fanIndex(SEGMENTS, 1), SEGMENTS + 2, baseMaterial)
  // 윗면: 입체에서는 위에 얹혀 있고, 펴면 옆면 띠의 윗변 가운데에 맞닿는다
  const [rim, tip] = [at(0.5, upTo, 1), shape === 'cone' ? at(0.5, 1, 1) : at(0.5, upTo, 1)]
  const length = Math.hypot(tip[0] - rim[0], tip[2] - rim[2]) || 1
  const flatCenter: Point = shape === 'cone' ? [rim[0] + ((tip[0] - rim[0]) / length) * r, extent * 0.001, rim[2] + ((tip[2] - rim[2]) / length) * r] : [rim[0], extent * 0.001, rim[2] - r]
  const topAt = (t: number, e: number, s: number): Point => {
    const a = t * 2 * Math.PI
    const rolled: Point = [e * r * Math.cos(a), h, e * r * Math.sin(a)]
    const flat: Point = [flatCenter[0] + e * r * Math.cos(a), extent * 0.001, flatCenter[2] + e * r * Math.sin(a)]
    return [rolled[0] + (flat[0] - rolled[0]) * s, rolled[1] + (flat[1] - rolled[1]) * s, rolled[2] + (flat[2] - rolled[2]) * s]
  }
  const pink = own(new THREE.MeshBasicMaterial({ color: '#e0442e' }))
  const lines = [
    { l: thickLine(SEGMENTS, extent * 0.005, pink), points: (s: number) => range(SEGMENTS).map((i) => at(i / SEGMENTS, 0, s)) },
    { l: thickLine(SEGMENTS, extent * 0.005, pink), points: (_s: number) => range(SEGMENTS).map((i): Point => [R * Math.cos((i / SEGMENTS) * 2 * Math.PI), extent * 0.002, R * Math.sin((i / SEGMENTS) * 2 * Math.PI)]) },
    { l: thickLine(SEGMENTS, extent * 0.005, own(new THREE.MeshBasicMaterial({ color: LENGTH_COLOR.h }))), points: (s: number) => range(SEGMENTS).map((i) => at(i / SEGMENTS, upTo, s)) },
    { l: thickLine(SEGMENTS, extent * 0.005, own(new THREE.MeshBasicMaterial({ color: LENGTH_COLOR.h }))), points: (s: number) => range(SEGMENTS).map((i) => topAt(i / SEGMENTS, 1, s)) },
  ]
  for (const { l } of lines) {
    own(l.mesh.geometry)
    group.add(l.mesh)
  }
  const apply = (progress: number) => {
    const s = clamp01(progress)
    setSide(range(rows).flatMap((j) => range(SEGMENTS).map((i) => at(i / SEGMENTS, upTo * (1 - j / rows), s))))
    setTop([topAt(0, 0, s), ...range(SEGMENTS).map((i) => topAt(i / SEGMENTS, 1, s))])
    for (const { l, points } of lines) l.set(points(s))
  }
  apply(0)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-L, 0, -(2 * L + R)), new THREE.Vector3(L, h, R)),
    apply,
    dispose() {
      group.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
  }
}

export function buildRevolutionLesson(size: RevolutionSize, kind: string, cutKind?: CutKind): LessonObject | null {
  return withTerms(revolutionBody(size, kind, cutKind), revolutionTerms(size, kind), Math.max(2 * reachOf(size), heightOf(size)) * 0.24)
}

function revolutionBody(size: RevolutionSize, kind: string, cutKind?: CutKind): LessonObject | null {
  if (kind === 'revolve') return buildRevolveLesson(size)
  if (kind === 'section') return buildRevolutionSectionLesson(size, cutKind)
  if (kind === 'revolve-net') return buildRevolutionNetLesson(size)
  if (kind !== 'revolve-area' && kind !== 'revolve-volume') return null
  // 겉넓이·부피: 다 돌린 입체를 돌리기와 같은 범위로. 도형이 갑자기 커지지 않게
  const lesson = buildRevolveLesson(size)
  lesson.apply(1)
  return { ...lesson, apply: () => {} }
}
