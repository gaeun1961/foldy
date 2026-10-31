// 구 부피 심화: 아르키메데스의 단면 비교 (ui.md "심화 보기", viewer.md "단면 비교"). 바닥이 y = 0.
// 왼쪽은 반지름 r 인 반구, 오른쪽은 반지름 r·높이 r 인 원기둥에서 꼭짓점이 바닥 가운데인 원뿔을 파낸 모양.
// 먼저 바닥과 높이가 같은 것을 같은 색 선으로 보이고(단계 하나), 그다음 cut(h ÷ r)으로 두 도형을 같은 높이에서 자른다 (setCut)
import * as THREE from 'three'
import { thickLine } from '../curved.ts'
import { clamp01, growingTube, textSprite } from './draw.ts'
import { LENGTH_COLOR, SECTION_RADIUS_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'

const SEGMENTS = 64
const INK = '#2f2a25'
const SECTION = '#f8df8e'
const PLANE = '#8c8680'

export function buildSphereSectionLesson(r: number): LessonObject {
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const gap = r * 1.2
  const [leftX, rightX] = [-gap, gap]
  const thick = r * 0.022

  const body = own(new THREE.MeshStandardMaterial({ color: '#faf6ee', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }))
  // 왼쪽: 평평한 면이 바닥, 둥근 쪽이 위
  const dome = new THREE.Mesh(own(new THREE.SphereGeometry(r, SEGMENTS, 32, 0, 2 * Math.PI, 0, Math.PI / 2)), body)
  dome.position.x = leftX
  group.add(dome)
  // 오른쪽: 바깥 벽 + 바닥 + 파낸 원뿔 면. 윗면은 뚫려 있다
  const carved = new THREE.Mesh(own(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, r), new THREE.Vector2(0, 0)], SEGMENTS)), body)
  carved.position.x = rightX
  group.add(carved)

  const rim = (x: number, y: number) => [...Array(SEGMENTS + 1).keys()].map((i) => new THREE.Vector3(x + r * Math.cos((i / SEGMENTS) * 2 * Math.PI), y, r * Math.sin((i / SEGMENTS) * 2 * Math.PI)))
  const lineMaterial = own(new THREE.LineBasicMaterial({ color: INK }))
  const line = (points: THREE.Vector3[]) => group.add(new THREE.Line(own(new THREE.BufferGeometry().setFromPoints(points)), lineMaterial))
  line(rim(rightX, r))
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const [c, s] = [r * Math.cos(a), r * Math.sin(a)]
    line([new THREE.Vector3(rightX, 0, 0), new THREE.Vector3(rightX + c, r, s)]) // 파낸 원뿔
    line([new THREE.Vector3(rightX + c, 0, s), new THREE.Vector3(rightX + c, r, s)]) // 바깥 벽
  }
  line([...Array(33).keys()].map((i) => new THREE.Vector3(leftX + r * Math.cos((i / 32) * Math.PI), r * Math.sin((i / 32) * Math.PI), 0)))

  // 바닥과 높이가 같다: 둘 다 길이 r 이라 같은 색
  const rMaterial = own(new THREE.MeshBasicMaterial({ color: LENGTH_COLOR.r }))
  for (const x of [leftX, rightX]) {
    const ring = thickLine(SEGMENTS, thick * 0.7, rMaterial)
    ring.set(rim(x, 0).map((p) => [p.x, p.y, p.z]))
    own(ring.mesh.geometry)
    group.add(ring.mesh)
  }
  const tube = (from: THREE.Vector3, to: THREE.Vector3) => {
    const t = growingTube(from, to, thick, rMaterial)
    own(t.mesh.geometry)
    group.add(t.mesh)
    return t
  }
  const sameLines = [tube(new THREE.Vector3(leftX, 0, 0), new THREE.Vector3(leftX + r, 0, 0)), tube(new THREE.Vector3(rightX, 0, 0), new THREE.Vector3(rightX + r, 0, 0)), tube(new THREE.Vector3(leftX, 0, 0), new THREE.Vector3(leftX, r, 0)), tube(new THREE.Vector3(rightX + r, 0, 0), new THREE.Vector3(rightX + r, r, 0))]
  const sprites: ReturnType<typeof textSprite>[] = []
  const label = (text: string, width = r * 0.65) => {
    const s = textSprite(text, width)
    group.add(s.sprite)
    sprites.push(s)
    return s.sprite
  }
  const sameLabels = [
    [leftX + r / 2, 0, r * 0.2],
    [rightX + r / 2, 0, r * 0.2],
    [leftX - r * 0.15, r / 2, 0],
    [rightX + r * 1.15, r / 2, 0],
  ].map(([x, y, z]) => {
    const s = label('r')
    s.position.set(x, y, z)
    return s
  })

  // 자르는 평면과 두 단면 (같은 강조색)
  const plane = new THREE.Mesh(own(new THREE.PlaneGeometry(2 * gap + 3 * r, 3 * r).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: PLANE, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })))
  group.add(plane)
  const sectionMaterial = own(new THREE.MeshBasicMaterial({ color: SECTION, side: THREE.DoubleSide }))
  const disc = new THREE.Mesh(own(new THREE.CircleGeometry(1, SEGMENTS).rotateX(-Math.PI / 2)), sectionMaterial)
  disc.position.x = leftX
  const ring = new THREE.Mesh(new THREE.BufferGeometry(), sectionMaterial)
  ring.position.x = rightX
  group.add(disc, ring)

  // 반구 단면 위의 직각삼각형: h 는 높이, 빗변은 r, 나머지는 단면 반지름. 평면 앞쪽(+z 아님, 가운데 세로면)에 그린다
  const riseMaterial = own(new THREE.MeshBasicMaterial({ color: LENGTH_COLOR.h }))
  const legMaterial = own(new THREE.MeshBasicMaterial({ color: SECTION_RADIUS_COLOR }))
  const seg = (material: THREE.Material) => {
    const s = thickLine(1, thick, material)
    own(s.mesh.geometry)
    group.add(s.mesh)
    return s
  }
  const [rise, leg, slope] = [seg(riseMaterial), seg(legMaterial), seg(rMaterial)]
  const riseLabel = label('h')
  const slopeLabel = label('r')
  const triangle = [rise.mesh, leg.mesh, slope.mesh, riseLabel, slopeLabel]

  let cut = 0.5
  const place = () => {
    const h = r * clamp01(cut)
    const rho = Math.sqrt(Math.max(0, r * r - h * h))
    plane.position.set(0, h, 0)
    disc.position.y = h + r * 0.002
    disc.scale.set(Math.max(rho, 1e-3), 1, Math.max(rho, 1e-3))
    disc.visible = rho > 1e-3
    // 고리: 안쪽 반지름은 원뿔의 그 높이 단면 = h, 바깥은 r
    ring.geometry.dispose()
    ring.geometry = new THREE.RingGeometry(Math.max(h, 1e-3), r, SEGMENTS).rotateX(-Math.PI / 2)
    ring.position.y = h + r * 0.002
    const y = h + r * 0.006
    rise.set([[leftX, 0, 0], [leftX, y, 0]])
    leg.set([[leftX, y, 0], [leftX + rho, y, 0]])
    slope.set([[leftX, 0, 0], [leftX + rho, y, 0]])
    riseLabel.position.set(leftX - r * 0.12, h / 2, 0)
    slopeLabel.position.set(leftX + rho / 2 + r * 0.1, h / 2 - r * 0.05, 0)
  }
  place()

  const apply = (progress: number) => {
    const setup = progress < 1 - 1e-6
    sameLines.forEach((t, k) => t.grow(setup ? clamp01(progress * 4 - k) : k < 2 ? 1 : 0))
    sameLabels.forEach((s, k) => (s.visible = setup ? progress * 4 >= k + 1 : k < 2))
    plane.visible = !setup
    disc.visible = !setup && r * r - (r * cut) ** 2 > 1e-6
    ring.visible = !setup
    for (const o of triangle) o.visible = !setup
  }
  apply(0)

  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-gap - 1.2 * r, 0, -1.2 * r), new THREE.Vector3(gap + 1.2 * r, r * 1.1, 1.2 * r)),
    setCut(next) {
      if (next === cut) return
      cut = next
      place()
    },
    apply,
    dispose() {
      sprites.forEach((s) => s.dispose())
      group.removeFromParent()
      ring.geometry.dispose()
      owned.forEach((x) => x.dispose())
    },
  }
}
