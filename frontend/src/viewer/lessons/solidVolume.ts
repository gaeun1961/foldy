// 상자가 아닌 도형의 부피 설명 (docs/specs/viewer.md "설명 모드"). 단위 정육면체로는 채울 수 없어서 도형마다 방식이 다르다.
// 각기둥: 밑면 판을 층층이 쌓는다. 각뿔: 같은 밑면·높이의 통에 물을 세 번 붓는다 (원뿔도 같은 방식, pour.ts).
// 좌표는 접힌 입체 기준
import * as THREE from 'three'
import type { PolygonSize, ShapeScene } from '../../shared/types.ts'
import { polyhedronOf, type Polyhedron } from '../polyhedra.ts'
import { layerTags, solidGeometry } from './draw.ts'
import type { LessonObject } from './index.ts'
import { lengthText } from './lengthLabels.ts'
import { buildPourLesson } from './pour.ts'
import { layerProgress, pieces, stackProgress } from './volumeLayout.ts'

const FILL = '#ffffff'
const ACTIVE = '#ffe8a8'
const GAP = 0.04 // 층 사이 틈 (층이 하나하나 보이게)
const prismOf = (size: PolygonSize) => polyhedronOf({ shape: 'prism', size, vertexLabels: [], lines: [], net: { layout: 'default' } } as unknown as ShapeScene)!

// 각기둥: 높이 1 짜리 판(밑면 모양)을 아래부터 쌓는다. 지금 쌓이는 판은 연한 노랑
export function buildPrismVolumeLesson(poly: Polyhedron, { height: h }: PolygonSize): LessonObject {
  const group = new THREE.Group()
  const geometry = solidGeometry(poly) // 가운데가 원점, 높이 h. y 로 줄여 판을 만든다
  const edges = new THREE.EdgesGeometry(geometry)
  const normal = new THREE.MeshStandardMaterial({ color: FILL })
  const active = new THREE.MeshStandardMaterial({ color: ACTIVE })
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
  const layers = pieces(h)
  let y = -h / 2
  const slabs = layers.map((sy) => {
    const mesh = new THREE.Mesh(geometry, normal)
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(edges, edgeMaterial))
    group.add(mesh)
    const slab = { mesh, sy, y }
    y += sy
    return slab
  })
  // 밑면 (밑넓이): 층을 쌓기 전에 먼저 칠한다
  const baseMaterial = new THREE.MeshBasicMaterial({ color: '#ffb74d' })
  const base = new THREE.Mesh(geometry, baseMaterial)
  base.scale.set(1, 0.004 / h, 1)
  base.position.y = -h / 2 + 0.01
  group.add(base)
  const reach = Math.max(...poly.positions.map((p) => Math.hypot(p[0], p[2])))
  let tagY = -h / 2
  const tagYs = layers.map((sy) => ((tagY += sy), tagY - sy / 2))
  const tags = layerTags(group, layers.length, Math.max(reach * 2, h) * 0.16, (k) => new THREE.Vector3(reach * 1.25, tagYs[k], 0))
  const apply = (whole: number) => {
    const { base: painted, layersP: progress } = stackProgress(layers.length, whole)
    base.visible = painted > 0
    const per = layerProgress(layers.length, progress)
    let current = per.findIndex((q) => q > 0 && q < 1)
    if (current < 0 && progress > 0 && progress < 1) current = per.filter((q) => q >= 1).length - 1
    tags.show(current)
    slabs.forEach((s, k) => {
      const height = Math.max(s.sy - GAP, 1e-3) * per[k]
      s.mesh.visible = per[k] > 0
      s.mesh.scale.set(1, Math.max(height, 1e-3) / h, 1)
      s.mesh.position.y = s.y + height / 2 // 판 아래가 제자리, 위로 자란다
      s.mesh.material = k === current ? active : normal
    })
  }
  apply(0)
  return {
    group,
    apply,
    dispose: () => {
      tags.dispose()
      group.removeFromParent()
      geometry.dispose()
      edges.dispose()
      for (const m of [normal, active, edgeMaterial, baseMaterial]) m.dispose()
    },
  }
}

// 각뿔: 같은 밑면·같은 높이의 기둥(통)에 물을 세 번 붓는다 (pour.ts)
export function buildPyramidVolumeLesson(poly: Polyhedron, size: PolygonSize): LessonObject {
  const { sides: n, edge, height: h } = size
  const R = edge / (2 * Math.sin(Math.PI / n))
  const floor = -h / 4 // 각뿔은 무게중심이 원점이라 밑면이 −h/4
  const body = solidGeometry(poly)
  const cupFill = solidGeometry(prismOf(size))
  return buildPourLesson({
    body,
    bodyEdges: new THREE.EdgesGeometry(body),
    baseY: floor,
    cupFill,
    fillHeight: h,
    cupEdges: new THREE.EdgesGeometry(cupFill),
    cupEdgesY: floor + h / 2,
    rim: poly.positions.slice(0, n).map((q) => new THREE.Vector3(q[0], 0, q[2])),
    cupX: 2 * R + Math.max(edge, h) * 0.45,
    radius: R,
    height: h,
    heightLabel: lengthText(h),
  })
}
