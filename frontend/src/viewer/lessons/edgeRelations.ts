import * as THREE from 'three'
import type { Polyhedron } from '../polyhedra.ts'
import { clamp01, DONE, growingTube, rightAngleMark, v3 } from './draw.ts'
import { defaultEdge, edgeRelations, edgesOf, meetPoint, type Edge } from './edgeRelationsLayout.ts'
import type { LessonObject } from './index.ts'

// 위치 관계 설명 (TODO-28, 바로 세운 입체). 기준 모서리(빨강)와 나머지 모서리를 평행 → 만남 → 꼬인 위치 순서로 한 종류씩,
// 종류 안에서는 모서리를 하나씩 보인다. 색만으로 구분하지 않는다 (ui.md): 평행은 두 모서리를 품는 반투명 평면,
// 만남은 만나는 점(+ 수직이면 직각 표시), 꼬인 위치는 점선 모서리와 양쪽으로 늘린 점선 직선(끝까지 만나지 않음)을 함께 보인다.
// 지난 종류는 연하게 남기고 평면·점·직선은 지금 종류만 보인다. 다른 모서리를 누르면 그 모서리가 기준이 된다
const REF = '#e03131'
const KIND_COLORS = ['#2f9e44', '#f08c00', '#7048e8'] // 평행, 만남, 꼬인 위치

export function buildEdgeRelationsLesson(poly: Polyhedron, radius: number): LessonObject {
  const p = poly.positions
  const r = radius * 0.012
  const ext = radius * 0.9 // 꼬인 위치에서 직선을 양쪽으로 늘리는 길이
  const group = new THREE.Group()

  // 누르기 쉽게 모서리마다 보이지 않는 굵은 원기둥 (Raycaster 는 visible 과 상관없이 맞힌다)
  const hitMaterial = new THREE.MeshBasicMaterial()
  const pickTargets = edgesOf(poly).map((e) => {
    const t = growingTube(v3(p[e[0]]), v3(p[e[1]]), radius * 0.05, hitMaterial)
    t.grow(1)
    t.mesh.visible = false
    t.mesh.userData.edge = e
    group.add(t.mesh)
    return t.mesh
  })

  const refMaterial = new THREE.MeshStandardMaterial({ color: REF })
  const strong = KIND_COLORS.map((color) => new THREE.MeshStandardMaterial({ color }))
  const faded = KIND_COLORS.map((color) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.3 }))
  const planeMaterial = new THREE.MeshBasicMaterial({ color: KIND_COLORS[0], transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  const dotMaterial = new THREE.MeshStandardMaterial({ color: KIND_COLORS[1] })
  const extMaterials = [REF, KIND_COLORS[2]].map((color) => new THREE.LineDashedMaterial({ color, dashSize: radius * 0.04, gapSize: radius * 0.03 }))
  const ownMaterials = [hitMaterial, refMaterial, ...strong, ...faded, planeMaterial, dotMaterial, ...extMaterials]

  // 모서리를 양쪽으로 늘린 점선 직선
  const extension = (e: Edge, material: THREE.LineDashedMaterial) => {
    const [a, b] = [v3(p[e[0]]), v3(p[e[1]])]
    const dir = b.clone().sub(a).normalize()
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.addScaledVector(dir, -ext), b.addScaledVector(dir, ext)]), material).computeLineDistances()
  }
  // 꼬인 위치 모서리는 점선 막대: 짧은 막대 여러 개. grow(q) 는 앞에서부터 q 만큼
  const dashedTube = (e: Edge, material: THREE.Material) => {
    const [a, b] = [v3(p[e[0]]), v3(p[e[1]])]
    const n = Math.max(3, Math.round(a.distanceTo(b) / (radius * 0.08)))
    const dashes = Array.from({ length: n }, (_, i) => growingTube(a.clone().lerp(b, i / n), a.clone().lerp(b, (i + 0.6) / n), r, material))
    const mesh = new THREE.Group()
    for (const d of dashes) mesh.add(d.mesh)
    return {
      mesh,
      grow: (q: number) => dashes.forEach((d, i) => d.grow(clamp01(q * n - i))),
      setMaterial: (m: THREE.Material) => dashes.forEach((d) => (d.mesh.material = m)),
    }
  }

  // 관계 모서리 하나: 막대(실선 또는 점선)와, 그 종류를 볼 때 함께 보이는 것(평면·점·직선)
  type Item = { mesh: THREE.Object3D; grow: (q: number) => void; setMaterial: (m: THREE.Material) => void; extra: THREE.Object3D | null }
  let display = new THREE.Group()
  let kinds: Item[][] = [[], [], []]
  let refExtension: THREE.Line | null = null
  let last = 0

  const build = (ref: Edge) => {
    display.removeFromParent()
    display.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    display = new THREE.Group()
    group.add(display)
    const [ra, rb] = [v3(p[ref[0]]), v3(p[ref[1]])]
    const refTube = growingTube(ra, rb, r * 1.5, refMaterial)
    refTube.grow(1)
    refExtension = extension(ref, extMaterials[0])
    display.add(refTube.mesh, refExtension)

    const rel = edgeRelations(poly, ref)
    const solid = (e: Edge, k: number): Item => {
      const t = growingTube(v3(p[e[0]]), v3(p[e[1]]), r, strong[k])
      return { mesh: t.mesh, grow: t.grow, setMaterial: (m) => (t.mesh.material = m), extra: null }
    }
    kinds = [
      // 평행: 두 모서리를 품는 평면 (기준 a, b 와 이 모서리에서 b·a 쪽 끝)
      rel.parallel.map((e) => {
        const item = solid(e, 0)
        const [c, d] = [v3(p[e[0]]), v3(p[e[1]])]
        const [nb, na] = c.distanceTo(rb) < d.distanceTo(rb) ? [c, d] : [d, c]
        const plane = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([ra, rb, nb, ra, nb, na]), planeMaterial)
        return { ...item, extra: plane }
      }),
      // 만남: 만나는 점, 수직이면 직각 표시
      rel.meet.map((e) => {
        const item = solid(e, 1)
        const at = v3(meetPoint(poly, ref, e))
        const extra = new THREE.Group()
        const dot = new THREE.Mesh(new THREE.SphereGeometry(r * 3, 16, 12), dotMaterial)
        dot.position.copy(at)
        extra.add(dot)
        if (rel.perpendicular.some((x) => x === e)) {
          const far = (q: THREE.Vector3[]) => (q[0].distanceTo(at) > q[1].distanceTo(at) ? q[0] : q[1]).clone() // 만나는 점에서 먼 끝 = 변의 방향
          extra.add(rightAngleMark(at, far([ra, rb]).sub(at), far([v3(p[e[0]]), v3(p[e[1]])]).sub(at), radius * 0.06, r * 0.5, strong[1]))
        }
        return { ...item, extra }
      }),
      // 꼬인 위치: 점선 모서리 + 늘린 점선 직선
      rel.skew.map((e) => {
        const t = dashedTube(e, strong[2])
        return { ...t, extra: extension(e, extMaterials[1]) }
      }),
    ]
    for (const items of kinds) for (const item of items) display.add(...(item.extra ? [item.mesh, item.extra] : [item.mesh]))
  }

  const apply = (progress: number) => {
    last = progress
    const qs = [0, 1, 2].map((k) => clamp01(progress * 3 - k))
    // 지금 종류: 진행 중인 종류. 종류 사이에 멈춰 있으면 마지막에 본 종류. 끝(1)에서는 모두 진하게 두고,
    // 평면·점은 끄되 꼬인 위치의 늘린 직선(끝까지 만나지 않음)은 남긴다
    let current = qs.findIndex((q) => q > 0 && q < DONE)
    if (current < 0 && progress > 0 && progress < DONE) current = qs.filter((q) => q >= DONE).length - 1
    kinds.forEach((items, k) =>
      items.forEach((item, j) => {
        const q = clamp01(qs[k] * items.length - j)
        item.grow(q)
        item.setMaterial(k === current || progress >= DONE ? strong[k] : faded[k])
        if (item.extra) item.extra.visible = q >= DONE && (k === current || (progress >= DONE && k === 2))
      }),
    )
    if (refExtension) refExtension.visible = current === 2 || progress >= DONE
  }

  build(defaultEdge(poly))
  apply(0)

  return {
    group,
    apply,
    pickTargets,
    pick: (target) => {
      build(target.userData.edge as Edge)
      apply(last)
    },
    dispose: () => {
      group.removeFromParent()
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      for (const m of ownMaterials) m.dispose()
    },
  }
}
