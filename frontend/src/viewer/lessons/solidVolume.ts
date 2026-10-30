// 상자가 아닌 도형의 부피 설명 (docs/specs/viewer.md "설명 모드"). 단위 정육면체로는 채울 수 없어서 도형마다 방식이 다르다.
// 각기둥: 밑면 판을 층층이 쌓는다. 각뿔: 같은 밑면·높이의 기둥에 세 번 붓는다 (나중에 원뿔·원기둥도 같은 방식).
// 정다면체: 면마다 가운데로 모이는 각뿔로 나눈다. 좌표는 접힌 입체 기준
import * as THREE from 'three'
import type { PolygonSize, ShapeScene } from '../../shared/types.ts'
import { polyhedronOf, type Polyhedron } from '../polyhedra.ts'
import { clamp01, DONE, solidGeometry, textSprite } from './draw.ts'
import type { LessonObject } from './index.ts'
import { lengthText } from './lengthLabels.ts'
import { layerProgress, pieces } from './volumeLayout.ts'

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
  const apply = (progress: number) => {
    const per = layerProgress(layers.length, progress)
    let current = per.findIndex((q) => q > 0 && q < 1)
    if (current < 0 && progress > 0 && progress < 1) current = per.filter((q) => q >= 1).length - 1
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
      group.removeFromParent()
      geometry.dispose()
      edges.dispose()
      for (const m of [normal, active, edgeMaterial]) m.dispose()
    },
  }
}

// 각뿔: 옆에 같은 밑면·같은 높이의 기둥을 세우고 세 번 붓는다. 단계마다 각뿔이 비면서 기둥이 ⅓ 씩 차고, 다음 단계에서 각뿔이 다시 찬다
export function buildPyramidVolumeLesson(poly: Polyhedron, size: PolygonSize): LessonObject {
  const { sides: n, edge, height: h } = size
  const R = edge / (2 * Math.sin(Math.PI / n)) // 밑면 반지름
  const dx = 2 * R + Math.max(edge, h) * 0.35 // 기둥을 옆에
  const floor = -h / 4 // 각뿔은 무게중심이 원점이라 밑면이 −h/4
  const group = new THREE.Group()
  const pyramidGeometry = solidGeometry(poly)
  const prismGeometry = solidGeometry(prismOf(size))
  const prismEdges = new THREE.EdgesGeometry(prismGeometry)
  const pyramidMaterial = new THREE.MeshStandardMaterial({ color: '#ffd982', transparent: true })
  const fillMaterial = new THREE.MeshStandardMaterial({ color: '#ffd982' })
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
  const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial)
  const frame = new THREE.LineSegments(prismEdges, edgeMaterial)
  frame.position.set(dx, floor + h / 2, 0)
  const fill = new THREE.Mesh(prismGeometry, fillMaterial)
  fill.position.x = dx
  group.add(pyramid, frame, fill)
  const heightLabel = textSprite(lengthText(h), Math.max(edge, h) * 0.3)
  heightLabel.sprite.position.set(dx + R + Math.max(edge, h) * 0.12, floor + h / 2, 0)
  group.add(heightLabel.sprite)

  const apply = (progress: number) => {
    const t = clamp01(progress) * 3
    const k = Math.min(Math.floor(t + 1e-6), 2) // 단계 경계의 소수 오차 (1/3 × 3 이 1 보다 조금 작게 나온다)
    const q = Math.max(0, t - k) // 이번 붓기 진행률. 단계 사이에 멈추면 0 이라 각뿔이 다시 찬 모습
    const level = progress >= DONE ? 1 : (k + q) / 3
    fill.visible = level > 0
    fill.scale.set(1, Math.max(level, 1e-3), 1)
    fill.position.y = floor + (h * level) / 2
    pyramidMaterial.opacity = progress >= DONE ? 0.15 : 1 - q * 0.85
  }
  apply(0)
  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-R, floor, -R), new THREE.Vector3(dx + R, floor + h, R)),
    apply,
    dispose: () => {
      heightLabel.dispose()
      group.removeFromParent()
      for (const g of [pyramidGeometry, prismGeometry, prismEdges]) g.dispose()
      for (const m of [pyramidMaterial, fillMaterial, edgeMaterial]) m.dispose()
    },
  }
}

// 정다면체: 면마다 "그 면이 밑면이고 가운데가 꼭대기인 각뿔"로 나눈다. 가운데에서 자라 나와 차례로 채운다
export function buildCenterPyramidsLesson(poly: Polyhedron): LessonObject {
  const group = new THREE.Group()
  const center = poly.positions.reduce((c, p) => c.add(new THREE.Vector3(...p)), new THREE.Vector3()).multiplyScalar(1 / poly.positions.length)
  const tints = ['#ffe8a8', '#ffffff'].map((color) => new THREE.MeshStandardMaterial({ color }))
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
  const owned: THREE.BufferGeometry[] = []
  const meshes = poly.faces.map((f, k) => {
    const pts = f.vertices.map((v) => new THREE.Vector3(...poly.positions[v]).sub(center))
    const apex = new THREE.Vector3()
    const tri = pts.flatMap((p, i) => [apex, p, pts[(i + 1) % pts.length]])
    const cap = pts.slice(1, -1).flatMap((p, i) => [pts[0], p, pts[i + 2]])
    const geometry = new THREE.BufferGeometry().setFromPoints([...tri, ...cap])
    geometry.computeVertexNormals()
    const edges = new THREE.EdgesGeometry(geometry, 1)
    owned.push(geometry, edges)
    const mesh = new THREE.Mesh(geometry, tints[k % 2])
    mesh.material = tints[k % 2]
    ;(mesh.material as THREE.Material).side = THREE.DoubleSide
    mesh.position.copy(center)
    mesh.add(new THREE.LineSegments(edges, edgeMaterial))
    group.add(mesh)
    return mesh
  })
  const apply = (progress: number) =>
    meshes.forEach((mesh, k) => {
      const q = clamp01(progress * meshes.length - k)
      mesh.visible = q > 0
      mesh.scale.setScalar(Math.max(q, 1e-3))
    })
  apply(0)
  return {
    group,
    apply,
    dispose: () => {
      group.removeFromParent()
      owned.forEach((g) => g.dispose())
      for (const m of [...tints, edgeMaterial]) m.dispose()
    },
  }
}
