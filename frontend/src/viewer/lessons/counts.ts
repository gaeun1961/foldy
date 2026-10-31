// 정다면체 개수 (ui.md 공식 시각화 규칙, viewer.md "설명 모드"): 면 → 모서리 → 꼭짓점을 하나씩 켜며 센다.
// 지금 켠 것의 번호만 작게 보이고, 다음 종류로 가면 앞 종류는 꺼진다. 다 세면 왼쪽 쪽에 표가 나온다. 좌표는 접힌 입체 기준
import * as THREE from 'three'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'
import { clamp01, growingTube, layerTags, v3 } from './draw.ts'
import { edgesOf } from './edgeRelationsLayout.ts'
import type { LessonObject } from './index.ts'

const FACE = '#f8df8e'
const EDGE = '#e0442e'
const VERTEX = '#2f6fd0'

export function buildCountsLesson(poly: Polyhedron): LessonObject {
  const middle = (points: Vec3[]) => points.reduce((c, p) => c.add(v3(p)), new THREE.Vector3()).multiplyScalar(1 / points.length)
  const center = middle(poly.positions)
  const reach = Math.max(...poly.positions.map((p) => v3(p).distanceTo(center)))
  const out = (p: THREE.Vector3) => p.clone().sub(center).multiplyScalar(1.2).add(center) // 번호는 입체 바깥쪽에
  // 위에서 아래로, 같은 높이는 한 바퀴 돌며 센다 (건너뛰어 세지 않게)
  const inOrder = <T>(items: T[], at: (item: T) => THREE.Vector3) =>
    items
      .map((item) => ({ item, p: at(item).sub(center) }))
      .sort((a, b) => Math.round((b.p.y - a.p.y) * 100) || Math.atan2(a.p.z, a.p.x) - Math.atan2(b.p.z, b.p.x))
      .map(({ item }) => item)

  const group = new THREE.Group()
  const white = new THREE.Color('#faf6ee')
  const faceColor = new THREE.Color(FACE)
  const faceMat = (side: THREE.Side) => new THREE.MeshStandardMaterial({ color: '#faf6ee', side, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
  const faceAt = (f: number) => middle(poly.faces[f].vertices.map((v) => poly.positions[v]))
  const faces = inOrder([...poly.faces.keys()], faceAt).map((f) => ({ f, materials: [faceMat(THREE.FrontSide), faceMat(THREE.BackSide)] as [THREE.Material, THREE.Material] }))

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: EDGE })
  const edgeAt = ([a, b]: [number, number]) => middle([poly.positions[a], poly.positions[b]])
  const edgeList = inOrder(edgesOf(poly), edgeAt)
  const edges = edgeList.map(([a, b]) => {
    const tube = growingTube(v3(poly.positions[a]), v3(poly.positions[b]), reach * 0.02, edgeMaterial)
    group.add(tube.mesh)
    return tube
  })

  const vertexMaterial = new THREE.MeshBasicMaterial({ color: VERTEX })
  const vertexGeometry = new THREE.SphereGeometry(reach * 0.05, 16, 12)
  const vertices = inOrder([...poly.positions.keys()], (v) => v3(poly.positions[v])).map((v) => {
    const mesh = new THREE.Mesh(vertexGeometry, vertexMaterial)
    mesh.position.copy(v3(poly.positions[v]))
    group.add(mesh)
    return { v, mesh }
  })

  const tagWidth = reach * 0.3
  const tags = [
    layerTags(group, faces.length, tagWidth, (k) => out(faceAt(faces[k].f)), ''),
    layerTags(group, edges.length, tagWidth, (k) => out(edgeAt(edgeList[k])), ''),
    layerTags(group, vertices.length, tagWidth, (k) => out(v3(poly.positions[vertices[k].v])), ''),
  ]

  const apply = (progress: number) => {
    const qs = [0, 1, 2].map((k) => clamp01(progress * 3 - k))
    // 지금 세는 종류만 켠다. 앞 종류는 다음 종류가 시작하면 꺼진다. lit[k] 는 그 종류를 몇 개 켰나
    const lit = qs.map((q, k) => (q > 0 && (qs[k + 1] ?? 0) <= 0 ? q * [faces, edges, vertices][k].length : 0))
    faces.forEach(({ materials }, i) => {
      for (const m of materials) (m as THREE.MeshStandardMaterial).color.copy(white).lerp(faceColor, clamp01(lit[0] - i))
    })
    edges.forEach((tube, i) => tube.grow(clamp01(lit[1] - i)))
    vertices.forEach(({ mesh }, i) => {
      const t = clamp01(lit[2] - i)
      mesh.visible = t > 0
      mesh.scale.setScalar(Math.max(t, 1e-3))
    })
    tags.forEach((tag, k) => tag.show(Math.ceil(lit[k] - 1e-6) - 1))
  }
  apply(0)

  const byFace = new Map(faces.map(({ f, materials }) => [f, materials]))
  return {
    group,
    faceMaterials: (f) => byFace.get(f) ?? null,
    apply,
    dispose: () => {
      tags.forEach((t) => t.dispose())
      group.removeFromParent()
      for (const tube of edges) tube.mesh.geometry.dispose()
      vertexGeometry.dispose()
      edgeMaterial.dispose()
      vertexMaterial.dispose()
      for (const { materials } of faces) for (const m of materials) m.dispose()
    },
  }
}
