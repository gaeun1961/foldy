// 겉넓이 앞에 붙는 피타고라스 단계 (ui.md 공식 시각화 규칙): 입체 위에 직각삼각형을 그려 옆면 높이(모선), 밑면 높이를 구한 뒤 원래 겉넓이 설명으로 넘어간다
import * as THREE from 'three'
import type { Polyhedron } from '../polyhedra.ts'
import { clamp01, rightTriangleOverlay, v3 } from './draw.ts'
import { LENGTH_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'
import type { SlantPlan } from './regularLayout.ts'
import { faceNormal, surfaceSteps } from './surfaceLayout.ts'

type Points = { foot: THREE.Vector3; end: THREE.Vector3; top: THREE.Vector3; out: THREE.Vector3; reach: number; edgeColor?: string; shift?: { leg: THREE.Vector3; rise: THREE.Vector3; edge: THREE.Vector3 }; edgeFirst?: boolean; whole?: { from: THREE.Vector3; to: THREE.Vector3; text: string } }

// lesson 은 원래 단계가 stepsAfter 개. 전체를 한 단계 늘려 첫 단계에 직각삼각형을 보이고, 끝까지 남긴다. hideAfter: 이 단계 뒤로 지운다 (원뿔은 옆면을 펴면 입체가 없어진다)
export function withPythagorasStep(lesson: LessonObject, stepsAfter: number, plan: SlantPlan, points: Points, hideAfter = Infinity): LessonObject {
  const overlay = rightTriangleOverlay(lesson.group, { ...points, text: { edge: plan.edge, leg: plan.leg, rise: plan.rise } })
  const apply = (progress: number) => {
    const at = progress * (stepsAfter + 1)
    overlay.show(at > hideAfter + 1e-6 ? 0 : clamp01(at))
    lesson.apply(clamp01((at - 1) / stepsAfter))
  }
  apply(0)
  return {
    ...lesson,
    apply,
    dispose: () => {
      overlay.dispose()
      lesson.dispose()
    },
  }
}

const reachOf = (poly: Polyhedron) => Math.max(...poly.positions.map((p) => v3(p).length()))

// 각뿔: 밑면 가운데 → 앞쪽 변의 중점 → 꼭대기. 빗변이 옆면 높이
export function pyramidPoints(poly: Polyhedron): Points {
  const positions = poly.positions.map(v3)
  const top = positions.reduce((a, p) => (p.y > a.y ? p : a))
  const base = poly.faces.find((f) => f.vertices.every((v) => positions[v] !== top))!.vertices.map((v) => positions[v])
  const foot = base.reduce((c, p) => c.clone().add(p), new THREE.Vector3()).multiplyScalar(1 / base.length)
  const front = [...base.keys()].reduce((best, i) => (base[i].z + base[(i + 1) % base.length].z > base[best].z + base[(best + 1) % base.length].z ? i : best), 0)
  const [left, right] = [base[front], base[(front + 1) % base.length]]
  const end = left.clone().lerp(right, 0.5)
  const reach = reachOf(poly)
  // 앞에서 보면 세 변이 한 줄로 겹쳐 보여서 글자를 좌우로 떨어뜨린다
  const shift = { leg: new THREE.Vector3(reach * 0.45, 0, 0), rise: new THREE.Vector3(-reach * 0.4, 0, 0), edge: new THREE.Vector3(reach * 0.4, reach * 0.15, 0) }
  return { foot, end, top, out: new THREE.Vector3(reach * 0.1, 0, reach * 0.1), reach, edgeColor: LENGTH_COLOR.l, shift, whole: { from: left, to: right, text: `${+left.distanceTo(right).toFixed(2)} cm` } }
}

// 삼각기둥: 잘 보이는 밑면 위에 높이를 내린다. 빗변이 밑면 모서리
export function prismBasePoints(poly: Polyhedron): Points {
  const step = surfaceSteps(poly).find((s) => poly.faces[s.face].vertices.length === 3)!
  const reach = reachOf(poly)
  const lift = v3(faceNormal(poly, step.face)).multiplyScalar(reach * 0.015)
  return { foot: v3(step.legs[1].from).add(lift), end: v3(step.legs[0].to).add(lift), top: v3(step.legs[1].to).add(lift), out: lift.clone().multiplyScalar(5), reach, edgeFirst: true }
}
