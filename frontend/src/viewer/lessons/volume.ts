import * as THREE from 'three'
import type { BoxSize } from '../../shared/types.ts'
import type { LessonObject } from './index.ts'
import { layerProgress, volumeLayout } from './volumeLayout.ts'

// 부피 설명 (TODO-26): 단위 정육면체를 한 층씩 쌓는다. 지금 쌓이는 층은 연한 노랑, 다 쌓은 층은 흰색 (ui.md 색 기준).
// 좌표는 접힌 입체 기준이라 면 트리 루트(tree.root)의 자식으로 붙인다
const GAP = 0.04 // 조각 사이 틈 (조각 하나하나가 보이게)

export function buildVolumeLesson(size: BoxSize, radius: number): LessonObject {
  const { cubes, layers, perLayer } = volumeLayout(size.width, size.depth, size.height)
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const edges = new THREE.EdgesGeometry(geometry)
  const normal = new THREE.MeshStandardMaterial({ color: '#ffffff' })
  const active = new THREE.MeshStandardMaterial({ color: '#ffe8a8' })
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
  const meshes = cubes.map((c) => {
    const mesh = new THREE.Mesh(geometry, normal)
    mesh.castShadow = true
    mesh.position.set(c.x, c.y, c.z)
    mesh.add(new THREE.LineSegments(edges, edgeMaterial))
    group.add(mesh)
    return mesh
  })

  const apply = (progress: number) => {
    const per = layerProgress(layers, progress)
    // 지금 쌓이는 층(0 과 1 사이)을 강조. 층 사이에 멈춰 있으면 마지막에 쌓은 층을 계속 강조하고, 다 쌓으면 끈다
    let current = per.findIndex((q) => q > 0 && q < 1)
    if (current < 0 && progress > 0 && progress < 1) current = per.filter((q) => q >= 1).length - 1
    cubes.forEach((c, k) => {
      const q = per[c.layer] * perLayer - c.index // 이 조각의 진행률: 1 이상이면 다 나타남, 0~1 이면 커지는 중
      const t = Math.min(1, Math.max(0, q))
      const mesh = meshes[k]
      mesh.visible = t > 0
      mesh.scale.set(c.sx - GAP, c.sy - GAP, c.sz - GAP).multiplyScalar(t)
      mesh.material = c.layer === current ? active : normal
    })
  }

  const dispose = () => {
    group.removeFromParent()
    geometry.dispose()
    edges.dispose()
    for (const m of [normal, active, edgeMaterial]) m.dispose()
  }
  void radius // 조각 크기는 학습지 단위(1)라서 도형 크기에 비례시키지 않는다
  return { group, apply, dispose }
}
