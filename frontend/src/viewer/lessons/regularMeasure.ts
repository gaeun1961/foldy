// 정다면체 겉넓이·부피 (ui.md 공식 시각화 규칙, 중3 피타고라스 활용). 좌표는 접힌 입체 기준. 식은 왼쪽 쪽에 (regularLayout.ts)
// 겉넓이: ① 면 하나를 칠한다 ② 높이를 내려 직각삼각형을 보인다 (정십이면체는 없음) ③ 나머지 면을 하나씩 켠다 (면 하나 넓이 × 면 개수)
// 부피 (정사면체·정팔면체): ① 밑면을 칠한다 ② 입체 안 직각삼각형으로 높이를 구한다. 정팔면체는 위아래 사각뿔을 다른 색으로
import * as THREE from 'three'
import type { Polyhedron } from '../polyhedra.ts'
import { clamp01, layerTags, rightTriangleOverlay, v3 } from './draw.ts'
import type { LessonObject } from './index.ts'
import type { RegularPlan } from './regularLayout.ts'
import { faceNormal, surfaceSteps } from './surfaceLayout.ts'

const FACE = '#ffd982'
const OTHER_HALF = '#b9dcff' // 정팔면체의 아래 사각뿔
const PLATE = '#ffb74d'

const faceMaterial = (side: THREE.Side) => new THREE.MeshStandardMaterial({ color: '#ffffff', side, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })

function paintedFaces(faces: number[]) {
  const made = faces.map((f) => ({ f, pair: [faceMaterial(THREE.FrontSide), faceMaterial(THREE.BackSide)] as [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial] }))
  const byFace = new Map(made.map(({ f, pair }) => [f, pair]))
  return { made, faceMaterials: (f: number) => byFace.get(f) ?? null, dispose: () => made.forEach(({ pair }) => pair.forEach((m) => m.dispose())) }
}

function measures(poly: Polyhedron) {
  const positions = poly.positions.map(v3)
  const center = positions.reduce((c, p) => c.clone().add(p), new THREE.Vector3()).multiplyScalar(1 / positions.length)
  return { positions, center, reach: Math.max(...positions.map((p) => p.distanceTo(center))) }
}

export function buildRegularSurfaceLesson(poly: Polyhedron, plan: RegularPlan): LessonObject {
  const group = new THREE.Group()
  const { positions, center, reach } = measures(poly)
  const faceCenter = (f: number) => poly.faces[f].vertices.reduce((c, v) => c.add(positions[v]), new THREE.Vector3()).multiplyScalar(1 / poly.faces[f].vertices.length)
  const step = surfaceSteps(poly)[0]
  const painted = paintedFaces([step.face, ...[...poly.faces.keys()].filter((f) => f !== step.face)])
  const faces = painted.made
  const tags = layerTags(group, faces.length, reach * 0.3, (k) => faceCenter(faces[k].f).sub(center).multiplyScalar(1.3).add(center), '')

  // 면의 높이: 꼭짓점에서 밑변 중점으로. 면 위에 살짝 띄운다
  const lift = v3(faceNormal(poly, step.face)).multiplyScalar(reach * 0.015)
  const overlay = plan.height
    ? rightTriangleOverlay(group, { foot: v3(step.legs[1].from).add(lift), end: v3(step.legs[0].to).add(lift), top: v3(step.legs[1].to).add(lift), out: lift.clone().multiplyScalar(5), reach, text: { edge: `${+step.legs[0].length.toFixed(2)} cm`, leg: `${plan.height.half} cm`, rise: `${plan.height.height} cm` } })
    : null

  const white = new THREE.Color('#ffffff')
  const lit = new THREE.Color(FACE)
  const apply = (progress: number) => {
    const qs = [...plan.areaHints.keys()].map((k) => clamp01(progress * plan.areaHints.length - k))
    const others = plan.height ? qs[2] : qs[1]
    overlay?.show(others > 0 ? 0 : qs[1])
    const count = others * (faces.length - 1) // 첫 면 다음으로 몇 개 켰나
    faces.forEach(({ pair }, i) => {
      const q = i === 0 ? clamp01(qs[0] / 0.5) : clamp01(count - (i - 1))
      for (const m of pair) m.color.copy(white).lerp(lit, q)
    })
    tags.show(others > 0 ? Math.ceil(count - 1e-6) : -1)
  }
  apply(0)
  return {
    group,
    faceMaterials: painted.faceMaterials,
    apply,
    dispose: () => {
      tags.dispose()
      overlay?.dispose()
      group.removeFromParent()
      painted.dispose()
    },
  }
}

export function buildRegularVolumeLesson(poly: Polyhedron, volume: NonNullable<RegularPlan['volume']>): LessonObject {
  const group = new THREE.Group()
  const { positions, reach } = measures(poly)
  const octa = volume.kind === 'octa'
  const apex = positions.reduce((a, p) => (p.y > a.y ? p : a))
  const bottom = octa ? positions.reduce((a, p) => (p.distanceTo(apex) > a.distanceTo(apex) ? p : a)) : null
  const ring = positions.filter((p) => p !== apex && p !== bottom)
  const middle = ring.reduce((c, p) => c.clone().add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length)
  const u = ring[0].clone().sub(middle)
  const w = new THREE.Vector3().crossVectors(apex.clone().sub(middle), u)
  const angle = (p: THREE.Vector3) => Math.atan2(p.clone().sub(middle).dot(w), p.clone().sub(middle).dot(u))
  const around = [...ring].sort((p, q) => angle(p) - angle(q))
  // 밑면 판: 정사면체는 삼각형, 정팔면체는 가운데 정사각형
  const plateMaterial = new THREE.MeshBasicMaterial({ color: PLATE, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
  const plateGeometry = new THREE.BufferGeometry().setFromPoints(around.slice(1, -1).flatMap((p, i) => [around[0], p, around[i + 2]]))
  const plate = new THREE.Mesh(plateGeometry, plateMaterial)
  group.add(plate)
  const overlay = rightTriangleOverlay(group, { foot: middle, end: ring[0], top: apex, out: new THREE.Vector3(reach * 0.08, 0, reach * 0.08), reach, text: { edge: `${+apex.distanceTo(ring[0]).toFixed(2)} cm`, leg: `${volume.leg} cm`, rise: `${volume.rise} cm` } })

  const painted = paintedFaces([...poly.faces.keys()])
  const tint = new THREE.Color(FACE)
  const otherHalf = new THREE.Color(OTHER_HALF)
  const white = new THREE.Color('#ffffff')
  for (const { f, pair } of painted.made) {
    const top = poly.faces[f].vertices.some((v) => positions[v] === apex)
    for (const m of pair) {
      m.color.copy(octa ? (top ? tint : otherHalf) : white)
      m.opacity = 0.3 // 입체 안이 보이게
    }
  }
  const apply = (progress: number) => {
    plate.visible = progress > 0
    overlay.show(clamp01(progress * 2 - 1))
  }
  apply(0)
  return {
    group,
    faceMaterials: painted.faceMaterials,
    apply,
    dispose: () => {
      overlay.dispose()
      group.removeFromParent()
      plateGeometry.dispose()
      plateMaterial.dispose()
      painted.dispose()
    },
  }
}
