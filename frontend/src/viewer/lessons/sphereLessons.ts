// 구 설명 (ui.md 공식 시각화 규칙, viewer.md "구"). 구는 바닥 y = 0 에 놓이고 가운데가 x = z = 0. 증명이 아니라 수업의 실험과 같다.
// 겉넓이: ① 가운데를 잘라 반지름이 같은 원을 보인다 ② 구에 실을 빈틈없이 감는다 ③ 풀면 같은 원 4개가 찬다. 실의 길이와 굵기가 같아 실제 넓이 비율대로 찬다
// 부피: ① 구가 꼭 들어가는 원기둥 통 ② 구에 담은 물을 부으면 통의 ⅔까지 찬다 (pour.ts)
import * as THREE from 'three'
import { outline } from './curvedLessons.ts'
import { clamp01, growingTube, textSprite } from './draw.ts'
import type { LessonKind } from './data.ts'
import type { LessonObject } from './index.ts'
import { LENGTH_COLOR } from './formulas.ts'
import { PAPER } from '../theme.ts'
import { lengthText } from './lengthLabels.ts'
import { withTerms, type LessonTerm } from './lessonTerms.ts'
import { withEndLines } from './lengthLines.ts'
import { buildPourLesson } from './pour.ts'
import { buildRevolutionSectionLesson, buildRevolveLesson, type CutKind } from './revolve.ts'
import { buildSphereSectionLesson } from './sphereSection.ts'

const SEGMENTS = 64
const TURNS = 20 // 구를 감는 바퀴 수
const THREAD = '#c2255c'
const SECTION = '#ffb74d'
const DISC = '#fff3d6'

// 실: 굵기가 간격의 절반이라 빈틈없이 덮는다. points 는 같은 길이 간격이라 drawRange 가 곧 감은 길이다
function thread(points: THREE.Vector3[], radius: number, material: THREE.Material) {
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length, radius, 5)
  const mesh = new THREE.Mesh(geometry, material)
  const count = geometry.index!.count
  const show = (q: number) => {
    mesh.visible = q > 0
    geometry.setDrawRange(0, Math.floor((count * q) / 3) * 3)
  }
  show(0)
  return { mesh, show }
}

function surfaceLesson(r: number): LessonObject {
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const threadRadius = (Math.PI * r) / (2 * TURNS)

  const sphereMaterial = own(new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true }))
  const sphere = new THREE.Mesh(own(new THREE.SphereGeometry(r, SEGMENTS, 48)), sphereMaterial)
  sphere.position.y = r
  sphere.castShadow = true
  group.add(sphere)

  // ① 가운데 단면: 구와 반지름이 같은 원
  const circle = own(new THREE.CircleGeometry(r, SEGMENTS).rotateX(-Math.PI / 2))
  const section = new THREE.Mesh(circle, own(new THREE.MeshBasicMaterial({ color: SECTION, side: THREE.DoubleSide })))
  section.position.y = r
  group.add(section)
  const radiusMaterial = own(new THREE.MeshBasicMaterial({ color: LENGTH_COLOR.r }))
  const tube = (from: THREE.Vector3, to: THREE.Vector3) => {
    const t = growingTube(from, to, r * 0.025, radiusMaterial)
    own(t.mesh.geometry)
    group.add(t.mesh)
    return t
  }
  const sectionLeg = tube(new THREE.Vector3(0, r, 0), new THREE.Vector3(r, r, 0))
  const sprites: ReturnType<typeof textSprite>[] = []
  const label = (text: string, x: number, y: number, z: number) => {
    const s = textSprite(text, r * 0.8)
    s.sprite.position.set(x, y, z)
    group.add(s.sprite)
    sprites.push(s)
    return s.sprite
  }
  const sectionLabel = label(lengthText(r), r / 2, r + r * 0.18, 0)

  // ② 구에 감는 실: 같은 길이 간격이 되도록 높이를 고르게 나눈다 (구의 겉넓이는 높이에 비례)
  const threadMaterial = own(new THREE.MeshStandardMaterial({ color: THREAD }))
  const wound = thread(
    [...Array(TURNS * 48 + 1).keys()].map((i) => {
      const phi = Math.acos(1 - (2 * i) / (TURNS * 48))
      const around = 2 * TURNS * phi
      const R = r + threadRadius * 0.5
      return new THREE.Vector3(R * Math.sin(phi) * Math.cos(around), r + R * Math.cos(phi), R * Math.sin(phi) * Math.sin(around))
    }),
    threadRadius,
    threadMaterial,
  )
  own(wound.mesh.geometry)
  group.add(wound.mesh)

  // ③ 같은 원 4개: 가운데에서 바깥으로 실을 채운다
  const cell = 2.2 * r
  const startX = 2.4 * r
  const discMaterial = own(new THREE.MeshBasicMaterial({ color: DISC }))
  const fills = [0, 1, 2, 3].map((k) => {
    const [x, z] = [startX + (k % 2) * cell, (Math.floor(k / 2) - 0.5) * cell]
    const disc = new THREE.Mesh(circle, discMaterial)
    disc.position.set(x, 0.01 * r, z)
    group.add(disc)
    const turns = r / (2 * threadRadius)
    const count = Math.ceil(turns * 48)
    const fill = thread(
      [...Array(count + 1).keys()].map((i) => {
        const t = i / count
        const rho = r * Math.sqrt(t)
        const around = 2 * Math.PI * turns * Math.sqrt(t)
        return new THREE.Vector3(x + rho * Math.cos(around), threadRadius, z + rho * Math.sin(around))
      }),
      threadRadius,
      threadMaterial,
    )
    own(fill.mesh.geometry)
    group.add(fill.mesh)
    const leg = tube(new THREE.Vector3(x, threadRadius * 2.5, z), new THREE.Vector3(x + r, threadRadius * 2.5, z))
    return { disc, fill, leg, number: label(`${k + 1}`, x, r * 0.5, z - r * 0.6) }
  })
  const fillLabel = label(lengthText(r), startX + r / 2, r * 0.45, -0.5 * cell + r * 0.3)

  const apply = (progress: number) => {
    const [q1, q2, q3] = [0, 1, 2].map((k) => clamp01(progress * 3 - k))
    const cut = q1 > 0 && q2 <= 0
    section.visible = cut
    sectionLeg.grow(cut ? clamp01((q1 - 0.3) / 0.4) : 0)
    sectionLabel.visible = cut && q1 >= 0.7
    sphereMaterial.opacity = cut ? 0.35 : 1
    sphereMaterial.depthWrite = !cut
    wound.show(q2 * (1 - q3))
    fills.forEach(({ disc, fill, leg, number }, k) => {
      const q = clamp01(q3 * 4 - k)
      disc.visible = q3 > 0
      fill.show(q)
      leg.grow(q > 0 ? 1 : 0)
      number.visible = q > 0
    })
    fillLabel.visible = q3 > 0
  }
  apply(0)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-r, 0, -cell), new THREE.Vector3(startX + cell + r, 2 * r, cell)),
    apply,
    dispose() {
      sprites.forEach((s) => s.dispose())
      group.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
  }
}

function volumeLesson(r: number): LessonObject {
  const h = 2 * r
  const size = 2 * r
  const cupX = 2 * r + size * 0.45
  const rim = [...Array(SEGMENTS).keys()].map((i) => new THREE.Vector3(r * Math.cos((i / SEGMENTS) * 2 * Math.PI), 0, r * Math.sin((i / SEGMENTS) * 2 * Math.PI)))
  const bodyEdges = new THREE.BufferGeometry().setFromPoints(rim.flatMap((p, i) => [p.clone().setY(r), rim[(i + 1) % SEGMENTS].clone().setY(r)]))
  const pour = buildPourLesson({
    body: new THREE.SphereGeometry(r, SEGMENTS, 48).translate(0, r, 0),
    bodyEdges,
    baseY: 0,
    cupFill: new THREE.CylinderGeometry(r, r, 1, SEGMENTS),
    fillHeight: 1,
    cupEdges: outline('cylinder', r, h),
    cupEdgesY: 0,
    rim,
    cupX,
    radius: r,
    height: h,
    heightLabel: lengthText(h),
    pours: 1,
    heightFromStart: true,
    share: 2 / 3,
  })
  // ① 구가 통에 꼭 들어가는 모습: 흐린 구를 통 안에 보인다
  const ghostGeometry = new THREE.SphereGeometry(r, SEGMENTS, 48)
  const ghostMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })
  const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial)
  ghost.position.set(cupX, r, 0)
  pour.group.add(ghost)
  const apply = (progress: number) => {
    ghost.visible = progress > 0 && progress <= 0.5 + 1e-6
    pour.apply(clamp01(progress * 2 - 1))
  }
  apply(0)
  // 끝나면 통 위에 공식의 r
  return withEndLines(
    {
      ...pour,
      apply,
      dispose() {
        pour.dispose()
        ghostGeometry.dispose()
        ghostMaterial.dispose()
      },
    },
    [{ from: new THREE.Vector3(cupX, h, 0), to: new THREE.Vector3(cupX + r, h, 0), color: LENGTH_COLOR.r }],
    size * 0.012,
  )
}

export function buildSphereLesson(r: number, kind: LessonKind, cutKind?: CutKind): LessonObject | null {
  if (kind === 'section') return buildRevolutionSectionLesson({ figure: 'semicircle', radius: r, height: 2 * r, gap: 0 }, cutKind)
  const terms: LessonTerm[] = kind === 'surface-area' || kind === 'volume' ? [{ word: '반지름', at: [r * 0.5, 2 * r + r * 0.25, r * 0.5] }, { word: '구', at: [-r * 0.6, 2 * r + r * 0.15, 0] }] : kind === 'sphere-section' ? [{ word: '단면', at: [-r * 1.2, r * 1.3, r * 0.6] }] : []
  return withTerms(sphereBody(r, kind), terms, 2 * r * 0.22)
}

function sphereBody(r: number, kind: LessonKind): LessonObject | null {
  if (kind === 'surface-area') return surfaceLesson(r)
  if (kind === 'sphere-section') return buildSphereSectionLesson(r)
  if (kind === 'revolve') return buildRevolveLesson({ figure: 'semicircle', radius: r, height: 2 * r, gap: 0 })
  return kind === 'volume' ? volumeLesson(r) : null
}

// 평소 화면의 구: 전개도가 없어서 입체만. 말기 화면과 같은 모양을 돌려준다
export function buildSphereBody(r: number, material: THREE.Material, ringColor = PAPER.sphereRing) {
  const group = new THREE.Group()
  const geometry = new THREE.SphereGeometry(r, SEGMENTS, 48)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = r
  mesh.castShadow = true
  const ringGeometry = new THREE.BufferGeometry().setFromPoints([...Array(SEGMENTS + 1).keys()].map((i) => new THREE.Vector3(r * Math.cos((i / SEGMENTS) * 2 * Math.PI), r, r * Math.sin((i / SEGMENTS) * 2 * Math.PI))))
  const ringMaterial = new THREE.LineBasicMaterial({ color: ringColor })
  group.add(mesh, new THREE.Line(ringGeometry, ringMaterial))
  return {
    group,
    apex: null,
    apply: (_s: number) => {},
    setPaired: (_on: boolean) => {},
    dispose() {
      group.removeFromParent()
      geometry.dispose()
      ringGeometry.dispose()
      ringMaterial.dispose()
    },
  }
}
