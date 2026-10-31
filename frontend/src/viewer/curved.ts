// 곡면 도형(원기둥·원뿔) 말기 (docs/specs/viewer.md "곡면 도형"). 면 트리를 쓰지 않는다.
// 전개도는 바닥(y = 0)에 눕는다: x 가로, z 앞쪽(+), y 위. s 는 펼침 값 (0 = 입체, 1 = 전개도).
// 위치를 섞지 않고 굽힌 정도를 바꿔서 길이가 늘거나 줄지 않는다. 아래 점 함수들은 옆면 가운데 선이 바닥에 붙은 자세이고,
// 화면에서는 밑면 원이 바닥에 남도록 전체를 그 원의 접선으로 돌린다(standPoint). 그래서 다 접으면 입체가 똑바로 선다
import * as THREE from 'three'
import type { ConePoint, CylinderPoint, Line, RoundSize, ShapeScene } from '../shared/types.ts'
import { PAPER, type Theme3D } from './theme.ts'

export type Point = [x: number, y: number, z: number]
export type CurvedShape = 'cylinder' | 'cone'

// 책 장면(CurvedViewer)과 홀로그램 무대(stage.ts)가 같이 쓰는 값. 한 곳에서만 정한다
// 원기둥·원뿔·구의 크기. 구는 지름을 높이로 (카메라·책 크기)
export function roundSizeOf(scene: ShapeScene): RoundSize {
  return scene.shape === 'sphere' ? { radius: scene.size.radius, height: 2 * scene.size.radius } : (scene.size as RoundSize)
}
// 곡면 선(관) 반지름: 펼친 전개도 크기의 0.4%. 작은 화면(홀로그램)은 scale 로 굵게
export function curvedLineRadius(size: RoundSize, scale = 1) {
  return Math.max(2 * Math.PI * size.radius, size.height + 4 * size.radius) * 0.004 * scale
}
// 옆면을 자른 선 위치 (shape-scene.md 곡면 전개도, 없으면 0)
export const seamOf = (scene: ShapeScene) => (scene.net as { seam?: number }).seam ?? 0

// 원기둥 옆면: a 는 가운데 선에서 잰 가로 길이(−πr ~ πr), v 는 세로(−h/2 ~ h/2). 곡률 (1 − s) / r 로 굽힌다
export function cylinderPoint(a: number, v: number, s: number, r: number): Point {
  const k = (1 - s) / r
  return k < 1e-9 ? [a, 0, v] : [Math.sin(k * a) / k, (1 - Math.cos(k * a)) / k, v]
}

// 원뿔 옆면: d 는 꼭짓점에서 거리(0 ~ L), f 는 가운데 모선에서 잰 부채꼴 각도(라디안). 꼭짓점이 원점, 가운데 모선은 +z.
// 밑면 반지름 rho 를 L(평면)에서 r 까지 줄인다. 모선 길이는 그대로
export function conePoint(d: number, f: number, s: number, r: number, L: number): Point {
  const rho = r + (L - r) * s
  const sin = rho / L
  const cos = Math.sqrt(Math.max(0, 1 - sin * sin))
  const t = (f * L) / rho // 원뿔 둘레를 도는 각도. 호 길이 d·f 가 그대로이게
  return [d * sin * Math.sin(t), d * sin * cos * (1 - Math.cos(t)), d * (cos * cos + sin * sin * Math.cos(t))]
}

// 밑면 원이 옆면에 붙은 접선을 축으로 도는 각도. 원기둥은 90°, 원뿔은 90° + 입체의 기울기 (옆면 끝과 원 둘레가 맞게)
export function discAngle(shape: CurvedShape, s: number, r: number, L: number) {
  const tilt = shape === 'cone' ? Math.asin(r / L) : 0
  return (1 - s) * (Math.PI / 2 + tilt)
}

// 밑면 원 위 점: tx 는 접선 방향, e 는 붙은 곳에서 원 쪽으로 간 거리. 붙은 곳은 z = at, dir 은 원이 뻗는 쪽 (+1 앞, −1 뒤)
export function discPoint(tx: number, e: number, angle: number, at: number, dir: 1 | -1): Point {
  return [tx, e * Math.sin(angle), at + dir * e * Math.cos(angle)]
}

// 밑면 원(붙은 곳 z = at, 도는 각도 angle)이 바닥에 눕도록 점을 돌린다. 다면체에서 루트 면이 바닥에 남는 것과 같다
export function standPoint([x, y, z]: Point, angle: number, at: number): Point {
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  return [x, y * c - (z - at) * s, at + y * s + (z - at) * c]
}

// 설명(겉넓이)에서 옆면을 펼칠 때의 점: 밑면 가운데가 원점이고 밑면은 바닥에 남는다. u 는 둘레 방향 0~1, w 는 세로 0(밑면 쪽)~1, s 는 펼침 값
export function sidePoint(shape: CurvedShape, { radius: r, height: h }: RoundSize, u: number, w: number, s: number): Point {
  const L = Math.hypot(r, h)
  const [hinge, p] =
    shape === 'cylinder'
      ? [h / 2, cylinderPoint((u - 0.5) * 2 * Math.PI * r, (0.5 - w) * h, s, r)]
      : [L, conePoint((1 - w) * L, ((u - 0.5) * 2 * Math.PI * r) / L, s, r, L)]
  const q = standPoint(p, discAngle(shape, s, r, L), hinge)
  return [q[0], q[1], q[2] - hinge - r]
}

// 원기둥 윗면 위의 점 (설명): 옆면 위쪽 변에 붙어서 같이 펼쳐진다. t 는 둘레 방향 0~1, e 는 가운데 0 ~ 둘레 1
export function topDiscPoint({ radius: r, height: h }: RoundSize, t: number, e: number, s: number): Point {
  const angle = discAngle('cylinder', s, r, 0)
  const a = t * 2 * Math.PI
  const q = standPoint(discPoint(e * r * Math.cos(a), r + e * r * Math.sin(a), angle, -h / 2, -1), angle, h / 2)
  return [q[0], q[1], q[2] - h / 2 - r]
}

const slantOf = ({ radius, height }: RoundSize) => Math.hypot(radius, height)

const ARC = 96 // 둘레를 나누는 수
const ALONG = 8 // 세로(모선)를 나누는 수

// 격자 면: 정점은 update 에서 채운다. 같은 삼각형을 두 번 그려 바깥·안쪽 색을 다르게 한다 (faceTree.ts 와 같음)
function surfaceMesh(index: number[], count: number, materials: [THREE.Material, THREE.Material]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setIndex(index)
  geometry.addGroup(0, Infinity, 0)
  geometry.addGroup(0, Infinity, 1)
  const mesh = new THREE.Mesh(geometry, materials)
  mesh.castShadow = true
  const set = (points: Point[]) => {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    points.forEach((p, i) => pos.setXYZ(i, p[0], p[1], p[2]))
    pos.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }
  return { mesh, set }
}

// 굵은 선: 짧은 막대를 이어 그린다. 1px 선보다 잘 보이고, 같은 색끼리 만나는 곳을 보여준다
export function thickLine(segments: number, radius: number, material: THREE.Material) {
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius, radius, 1, 6), material, segments)
  mesh.frustumCulled = false
  const up = new THREE.Vector3(0, 1, 0)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const [a, b, mid, scale] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  const set = (points: Point[]) => {
    for (let i = 0; i < segments; i++) {
      a.set(...points[i])
      b.set(...points[i + 1])
      const length = a.distanceTo(b)
      q.setFromUnitVectors(up, b.clone().sub(a).normalize())
      m.compose(mid.addVectors(a, b).multiplyScalar(0.5), q, scale.set(1, length, 1))
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  return { mesh, set }
}

export const gridIndex = (rows: number, cols: number) => {
  const out: number[] = []
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const [p, q, u, v] = [j * (cols + 1) + i, j * (cols + 1) + i + 1, (j + 1) * (cols + 1) + i, (j + 1) * (cols + 1) + i + 1]
      out.push(p, q, u, q, v, u) // 평평할 때 법선이 아래: 위에서는 안쪽 면이 보인다 (다면체 전개도와 같음)
    }
  return out
}
export const fanIndex = (n: number, dir: 1 | -1) => [...Array(n).keys()].flatMap((i) => (dir > 0 ? [0, i + 1, i + 2] : [0, i + 2, i + 1]))

export interface CurvedNet {
  group: THREE.Group
  apex: THREE.Object3D | null // 원뿔 꼭짓점 표시 (라벨을 붙인다)
  apply(s: number): void
  setPaired(on: boolean): void // 맞닿는 선을 색으로 보일지
  dispose(): void
}

// 곡면 위 선 (shape-scene.md 곡면 전개도): 끝점을 전개도 평면의 (x, z) 로 바꿔 곧게 잇고, 나눈 점마다 옆면과 같은 변환을 건다. 그래서 펴면 직선, 말면 곡면을 따라 감긴다.
// 돌려주는 함수: 펼침 값 s → 점들. 좌표는 옆면 점 함수와 같다 (cylinderPoint, conePoint)
export function curvedLinePoints(shape: CurvedShape, size: RoundSize, line: Line<CylinderPoint | ConePoint>, seam = 0, count = 64) {
  const { radius: r, height: h } = size
  const L = slantOf(size)
  const sector = (2 * Math.PI * r) / L
  const t = (angle: number) => (angle - seam) / 360 - 0.5 // 옆면 가운데 선에서 잰 비율 (−½ ~ ½)
  const flat = (p: CylinderPoint | ConePoint): [number, number] => {
    if (shape === 'cylinder') {
      const [angle, up] = 'top' in p ? [p.top, 1] : 'bottom' in p ? [p.bottom, 0] : [(p as { surface: { angle: number; h: number } }).surface.angle, (p as { surface: { angle: number; h: number } }).surface.h]
      return [t(angle) * 2 * Math.PI * r, (0.5 - up) * h]
    }
    if ('apex' in p) return [0, 0]
    const [angle, d] = 'base' in p ? [p.base, L] : [(p as { surface: { angle: number; r: number } }).surface.angle, (p as { surface: { angle: number; r: number } }).surface.r * L]
    return [d * Math.sin(t(angle) * sector), d * Math.cos(t(angle) * sector)]
  }
  const [a, b] = [flat(line.from), flat(line.to)]
  return (s: number) =>
    [...Array(count + 1).keys()].map((i): Point => {
      const [x, z] = [a[0] + ((b[0] - a[0]) * i) / count, a[1] + ((b[1] - a[1]) * i) / count]
      return shape === 'cylinder' ? cylinderPoint(x, z, s, r) : conePoint(Math.hypot(x, z), Math.atan2(x, z), s, r, L)
    })
}

// 만나는 선 색 (ui.md 색 기준): 자른 선 둘, 위 둘레와 위 원, 아래 둘레와 아래 원
// 색은 3D 디자인 토큰 (theme.ts curved). 두 밑면은 같은 테두리 (ui.md 공식 시각화 규칙)
const DRAWN = '#7048e8' // 곡면 위 선 (실 감기와 같은 색)

export function buildCurvedNet(
  shape: CurvedShape,
  size: RoundSize,
  faces: [THREE.Material, THREE.Material],
  lineRadius: number,
  drawn: Line<CylinderPoint | ConePoint>[] = [],
  seam = 0,
  colors: Theme3D['curved'] = PAPER.curved,
): CurvedNet {
  const PAIR = { seam: colors.seam, top: colors.rim, bottom: colors.rim }
  const PLAIN = colors.plain
  const { radius: r, height: h } = size
  const L = slantOf(size)
  const group = new THREE.Group()
  // 밑면 원을 바닥에 두려고 돌리는 판: 붙은 곳이 회전축 (standPoint 와 같은 회전)
  const hingeAt = shape === 'cylinder' ? h / 2 : L
  const pivot = new THREE.Group()
  pivot.position.z = hingeAt
  const inner = new THREE.Group()
  inner.position.z = -hingeAt
  pivot.add(inner)
  group.add(pivot)
  const materials = { seam: new THREE.MeshBasicMaterial(), top: new THREE.MeshBasicMaterial(), bottom: new THREE.MeshBasicMaterial(), drawn: new THREE.MeshBasicMaterial({ color: DRAWN }) }
  const lines: { line: ReturnType<typeof thickLine>; points: (s: number) => Point[] }[] = []
  const addLine = (segments: number, material: THREE.Material, points: (s: number) => Point[]) => {
    const line = thickLine(segments, lineRadius, material)
    inner.add(line.mesh)
    lines.push({ line, points })
  }
  const circle = (s: number, at: number, dir: 1 | -1) => {
    const angle = discAngle(shape, s, r, L)
    return [...Array(ARC + 1).keys()].map((i) => {
      const t = (i / ARC) * 2 * Math.PI
      return discPoint(r * Math.cos(t), r + r * Math.sin(t), angle, at, dir)
    })
  }
  const disc = (at: number, dir: 1 | -1) => {
    const m = surfaceMesh(fanIndex(ARC, dir), ARC + 2, faces)
    inner.add(m.mesh)
    return (s: number) => m.set([discPoint(0, r, discAngle(shape, s, r, L), at, dir), ...circle(s, at, dir)])
  }

  let sidePoints: (s: number) => Point[]
  const updates: ((s: number) => void)[] = []
  let apex: THREE.Mesh | null = null
  if (shape === 'cylinder') {
    const at = (i: number, j: number, s: number) => cylinderPoint((i / ARC - 0.5) * 2 * Math.PI * r, (j / ALONG - 0.5) * h, s, r)
    sidePoints = (s) => [...Array(ALONG + 1).keys()].flatMap((j) => [...Array(ARC + 1).keys()].map((i) => at(i, j, s)))
    const edge = (i: number) => (s: number) => [...Array(ALONG + 1).keys()].map((j) => at(i, j, s))
    const rim = (j: number) => (s: number) => [...Array(ARC + 1).keys()].map((i) => at(i, j, s))
    addLine(ALONG, materials.seam, edge(0))
    addLine(ALONG, materials.seam, edge(ARC))
    addLine(ARC, materials.top, rim(0))
    addLine(ARC, materials.bottom, rim(ALONG))
    addLine(ARC, materials.top, (s) => circle(s, -h / 2, -1))
    addLine(ARC, materials.bottom, (s) => circle(s, h / 2, 1))
    updates.push(disc(-h / 2, -1), disc(h / 2, 1))
  } else {
    const sector = (2 * Math.PI * r) / L
    const at = (i: number, j: number, s: number) => conePoint((j / ALONG) * L, (i / ARC - 0.5) * sector, s, r, L)
    sidePoints = (s) => [...Array(ALONG + 1).keys()].flatMap((j) => [...Array(ARC + 1).keys()].map((i) => at(i, j, s)))
    addLine(ALONG, materials.seam, (s) => [...Array(ALONG + 1).keys()].map((j) => at(0, j, s)))
    addLine(ALONG, materials.seam, (s) => [...Array(ALONG + 1).keys()].map((j) => at(ARC, j, s)))
    addLine(ARC, materials.bottom, (s) => [...Array(ARC + 1).keys()].map((i) => at(i, ALONG, s)))
    addLine(ARC, materials.bottom, (s) => circle(s, L, 1))
    updates.push(disc(L, 1))
    apex = new THREE.Mesh(new THREE.SphereGeometry(lineRadius * 2.5, 12, 8), new THREE.MeshBasicMaterial({ color: PLAIN }))
    inner.add(apex)
  }
  for (const line of drawn) addLine(64, materials.drawn, curvedLinePoints(shape, size, line, seam))
  const side = surfaceMesh(gridIndex(ALONG, ARC), (ALONG + 1) * (ARC + 1), faces)
  inner.add(side.mesh)

  const net: CurvedNet = {
    group,
    apex,
    apply(s) {
      pivot.rotation.x = discAngle(shape, s, r, L)
      side.set(sidePoints(s))
      for (const u of updates) u(s)
      for (const { line, points } of lines) line.set(points(s))
    },
    setPaired(on) {
      materials.seam.color.set(on ? PAIR.seam : PLAIN)
      materials.top.color.set(on ? PAIR.top : PLAIN)
      materials.bottom.color.set(on ? PAIR.bottom : PLAIN)
    },
    dispose() {
      group.removeFromParent()
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      for (const m of Object.values(materials)) m.dispose()
      if (apex) (apex.material as THREE.Material).dispose()
    },
  }
  net.setPaired(true)
  net.apply(1)
  return net
}
