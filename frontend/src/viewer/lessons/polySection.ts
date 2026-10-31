// 다면체 단면 (ui.md 공식 시각화 규칙, viewer.md "단면"): 평면이 모서리와 만나는 점들로 단면 다각형을 만들고 이름을 붙인다. 좌표는 접힌 입체 기준
import * as THREE from 'three'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'
import { clamp01, textSprite } from './draw.ts'
import { edgesOf } from './edgeRelationsLayout.ts'
import type { LessonObject } from './index.ts'
import { cutAngle, type CutKind } from './revolveLayout.ts'

const EPS = 1e-7
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const size = (a: Vec3) => Math.sqrt(dot(a, a))

// 평면: 세로는 입체 가운데를 지나 앞을 보고, 가로·비스듬히는 cut 높이의 가운데를 지난다
function planeOf(poly: Polyhedron, kind: CutKind, cut: number) {
  const a = cutAngle(kind)
  const normal: Vec3 = [0, Math.cos(a), Math.sin(a)]
  const ys = poly.positions.map((p) => p[1])
  const [low, high] = [Math.min(...ys), Math.max(...ys)]
  const mean = (k: number) => poly.positions.reduce((s, p) => s + p[k], 0) / poly.positions.length
  const point: Vec3 = [mean(0), kind === 'vertical' ? mean(1) : low + (high - low) * clamp01(cut), mean(2)]
  return { normal, point }
}

// 단면 다각형의 꼭짓점 (둘레 순서). 평면이 입체를 지나지 않으면 3개 미만
export function polySectionPoints(poly: Polyhedron, kind: CutKind, cut: number): Vec3[] {
  const { normal, point } = planeOf(poly, kind, cut)
  const found: Vec3[] = []
  const add = (p: Vec3) => {
    if (!found.some((q) => size(sub(p, q)) < 1e-6)) found.push(p)
  }
  for (const [i, j] of edgesOf(poly)) {
    const [a, b] = [poly.positions[i], poly.positions[j]]
    const [da, db] = [dot(sub(a, point), normal), dot(sub(b, point), normal)]
    if (Math.abs(da) < EPS) add(a)
    if (Math.abs(db) < EPS) add(b)
    if (da * db < -EPS * EPS) {
      const t = da / (da - db)
      add([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
    }
  }
  if (found.length < 3) return []
  // 평면 위 두 방향으로 각도를 재서 둘레 순서로
  const u = new THREE.Vector3(...normal).cross(new THREE.Vector3(1, 0, 0)).normalize()
  const v = new THREE.Vector3(1, 0, 0)
  const center = found.reduce((c, p) => c.add(new THREE.Vector3(...p)), new THREE.Vector3()).multiplyScalar(1 / found.length)
  const angle = (p: Vec3) => {
    const d = new THREE.Vector3(...p).sub(center)
    return Math.atan2(d.dot(u), d.dot(v))
  }
  return [...found].sort((p, q) => angle(p) - angle(q))
}

// 단면 다각형의 이름: 길이와 각으로 판별한다
export function polygonShapeName(points: Vec3[]) {
  const n = points.length
  const side = (i: number) => sub(points[(i + 1) % n], points[i])
  const lengths = points.map((_, i) => size(side(i)))
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-5
  const allSame = lengths.every((l) => same(l, lengths[0]))
  const right = (i: number) => Math.abs(dot(side(i), side((i + 1) % n))) < 1e-5
  const parallel = (i: number, j: number) => Math.abs(Math.abs(dot(side(i), side(j))) - lengths[i] * lengths[j]) < 1e-5
  if (n === 3) return allSame ? '정삼각형' : [0, 1, 2].some(right) ? '직각삼각형' : [0, 1, 2].some((i) => same(lengths[i], lengths[(i + 1) % 3])) ? '이등변삼각형' : '삼각형'
  if (n === 4) {
    const rect = [0, 1, 2, 3].every(right)
    if (rect) return allSame ? '정사각형' : '직사각형'
    if (allSame) return '마름모'
    const [p02, p13] = [parallel(0, 2), parallel(1, 3)]
    return p02 && p13 ? '평행사변형' : p02 || p13 ? '사다리꼴' : '사각형'
  }
  const name = ['', '', '', '', '', '오각형', '육각형', '칠각형', '팔각형'][n] ?? `${n}각형`
  return allSame ? `정${name}` : name
}

export const polySectionName = (poly: Polyhedron, kind: CutKind, cut: number) => {
  const points = polySectionPoints(poly, kind, cut)
  return points.length ? polygonShapeName(points) : null
}

export function buildPolySectionLesson(poly: Polyhedron, kind: CutKind = 'vertical'): LessonObject {
  const group = new THREE.Group()
  const a = cutAngle(kind)
  const [c, s] = [Math.cos(a), Math.sin(a)]
  const reach = Math.max(...poly.positions.map((p) => Math.hypot(p[0], p[1], p[2]))) * 1.1
  const planeMaterial = new THREE.MeshBasicMaterial({ color: '#74c0fc', transparent: true, side: THREE.DoubleSide, depthWrite: false })
  const planeGeometry = new THREE.PlaneGeometry(reach * 2.6, reach * 2.6)
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  const rise = new THREE.Vector3(0, s, -c)
  plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), rise, new THREE.Vector3(1, 0, 0).cross(rise)))
  group.add(plane)
  const faceMaterial = new THREE.MeshBasicMaterial({ color: '#ffb74d', transparent: true, side: THREE.DoubleSide, depthWrite: false })
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
  const face = new THREE.Mesh(new THREE.BufferGeometry(), faceMaterial)
  const outline = new THREE.LineLoop(new THREE.BufferGeometry(), lineMaterial)
  group.add(face, outline)
  let label: ReturnType<typeof textSprite> | null = null
  let shown = 0
  let cut = 0.5
  const lift = new THREE.Vector3(0, c, s).multiplyScalar(reach * 0.004)
  const place = () => {
    const points = polySectionPoints(poly, kind, cut).map((p) => new THREE.Vector3(...p).add(lift))
    const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / Math.max(points.length, 1))
    face.geometry.dispose()
    outline.geometry.dispose()
    face.geometry = new THREE.BufferGeometry().setFromPoints(points.flatMap((p, i) => [center, p, points[(i + 1) % points.length]]))
    outline.geometry = new THREE.BufferGeometry().setFromPoints(points)
    const { point } = planeOf(poly, kind, cut)
    plane.position.set(...point)
    label?.dispose()
    label?.sprite.removeFromParent()
    label = null
    if (points.length) {
      label = textSprite(polygonShapeName(polySectionPoints(poly, kind, cut)), reach * 0.5, false, '#6741d9')
      label.sprite.position.copy(center).add(lift.clone().multiplyScalar(4))
      label.sprite.visible = shown >= 1
      group.add(label.sprite)
    }
  }
  place()
  const apply = (progress: number) => {
    const q = clamp01(progress)
    shown = q
    planeMaterial.opacity = 0.2 * clamp01(q / 0.3)
    plane.visible = q > 0
    faceMaterial.opacity = clamp01((q - 0.3) / 0.5)
    face.visible = q > 0.3
    outline.visible = q > 0.3
    if (label) label.sprite.visible = q >= 1
  }
  apply(0)
  return {
    group,
    view: new THREE.Vector3(0.15, kind === 'vertical' ? 0.5 : 1.1, 1), // 세로는 앞에서, 가로·비스듬히는 위에서
    setCut(next) {
      if (next === cut) return
      cut = next
      place()
    },
    apply,
    dispose() {
      label?.dispose()
      group.removeFromParent()
      face.geometry.dispose()
      outline.geometry.dispose()
      planeGeometry.dispose()
      for (const m of [planeMaterial, faceMaterial, lineMaterial]) m.dispose()
    },
  }
}
