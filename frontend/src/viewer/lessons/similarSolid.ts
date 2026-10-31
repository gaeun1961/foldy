// 상자가 아닌 도형의 닮음 설명 (docs/specs/viewer.md "설명 모드"). 각뿔·정사면체는 작은 도형만으로 빈틈없이 채울 수 없어서,
// 큰 도형(틀) 옆에 작은 면 k²장, 작은 도형 k³개를 늘어놓아 몇 배인지 보여준다. 나중에 원기둥·원뿔도 같은 방식.
// 단계: 길이 1 + 한 면 1 + 부피 k 층 (similarSteps, 상자와 같다). 좌표는 접힌 입체 기준
import * as THREE from 'three'
import type { Polyhedron } from '../polyhedra.ts'
import { clamp01, growingTube, solidGeometry, textSprite, v3 } from './draw.ts'
import type { LessonObject } from './index.ts'

const PIECE = ['#e0442e', '#2f6fd0', '#2e9e4f'] // 길이 조각 (similar.ts 와 같은 색)
const TILE = '#f8df8e'

export function buildSimilarSolidLesson(poly: Polyhedron, k: number, radius: number): LessonObject {
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const geometry = own(solidGeometry(poly))
  const box = new THREE.Box3().setFromArray(poly.positions.flat())
  const size = box.getSize(new THREE.Vector3())
  const gap = Math.max(size.x, size.y, size.z) * 0.3
  const r = radius * 0.008

  // 큰 도형 틀: 작은 도형 오른쪽, 바닥과 앞면을 맞춘다
  const bigMin = new THREE.Vector3(box.max.x + gap, box.min.y, box.max.z - k * size.z)
  const toBig = (p: THREE.Vector3) => p.clone().sub(box.min).multiplyScalar(k).add(bigMin)
  const edgeMaterial = own(new THREE.LineBasicMaterial({ color: '#2f2a25' }))
  const edges = own(new THREE.EdgesGeometry(geometry, 1))
  const frame = new THREE.LineSegments(edges, edgeMaterial)
  frame.scale.setScalar(k)
  frame.position.copy(toBig(new THREE.Vector3()))
  group.add(frame)

  // ① 길이: 바닥에서 가장 앞쪽 모서리와, 큰 도형의 같은 모서리를 k 조각으로
  const bottom = poly.faces.reduce((best, f, i) => (avgY(poly, f.vertices) < avgY(poly, poly.faces[best].vertices) - 1e-9 ? i : best), 0)
  const ring = poly.faces[bottom].vertices
  const edgePairs = ring.map((v, i) => [v3(poly.positions[v]), v3(poly.positions[ring[(i + 1) % ring.length]])])
  const [ea, eb] = edgePairs.reduce((best, e) => (e[0].z + e[1].z > best[0].z + best[1].z ? e : best))
  const pieceMaterials = PIECE.map((color) => own(new THREE.MeshStandardMaterial({ color })))
  const smallEdge = growingTube(ea, eb, r * 1.5, pieceMaterials[0])
  const [ba, bb] = [toBig(ea), toBig(eb)]
  const segments = Array.from({ length: k }, (_, i) => growingTube(ba.clone().lerp(bb, i / k), ba.clone().lerp(bb, (i + 1) / k), r * 1.5, pieceMaterials[i % PIECE.length]))
  group.add(smallEdge.mesh, ...segments.map((s) => s.mesh))
  own(smallEdge.mesh.geometry)
  segments.forEach((s) => own(s.mesh.geometry))

  // 늘어놓는 자리: 큰 도형 오른쪽. 칸 크기는 작은 도형 + 틈
  const cell = size.clone().multiplyScalar(1.12)
  const start = new THREE.Vector3(bigMin.x + k * size.x + gap, box.min.y, box.max.z - cell.z)
  const placeAt = (i: number, layer: number, m: number) => start.clone().add(new THREE.Vector3(i * cell.x, layer * cell.y, -m * cell.z)).sub(box.min)

  // ② 한 면: 바닥 면 k² 장을 바닥에 깐다
  const facePts = ring.map((v) => v3(poly.positions[v]))
  const faceGeometry = own(new THREE.BufferGeometry().setFromPoints(facePts.slice(1, -1).flatMap((p, i) => [facePts[0], p, facePts[i + 2]])))
  faceGeometry.computeVertexNormals()
  const tileMaterial = own(new THREE.MeshStandardMaterial({ color: TILE, side: THREE.DoubleSide }))
  const tiles = Array.from({ length: k * k }, (_, n) => {
    const mesh = new THREE.Mesh(faceGeometry, tileMaterial)
    mesh.position.copy(placeAt(n % k, 0, Math.floor(n / k)))
    group.add(mesh)
    return mesh
  })
  const widthLabel = Math.max(size.x, size.y, size.z) * 0.9
  const labelAt = start.clone().add(new THREE.Vector3((k * cell.x) / 2, k * cell.y + gap * 0.4, (-k * cell.z) / 2))
  const tileLabel = textSprite(`${k * k}장`, widthLabel)
  tileLabel.sprite.position.copy(start).add(new THREE.Vector3((k * cell.x) / 2, gap * 0.6, (-k * cell.z) / 2))
  const copyLabel = textSprite(`${k ** 3}개`, widthLabel)
  copyLabel.sprite.position.copy(labelAt)
  group.add(tileLabel.sprite, copyLabel.sprite)

  // ③ 부피: 작은 도형 k³ 개를 층마다 늘어놓는다
  const normal = own(new THREE.MeshStandardMaterial({ color: '#faf6ee' }))
  const active = own(new THREE.MeshStandardMaterial({ color: '#f8df8e' }))
  const copies = Array.from({ length: k ** 3 }, (_, n) => {
    const layer = Math.floor(n / (k * k))
    const index = n % (k * k)
    const mesh = new THREE.Mesh(geometry, normal)
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(edges, edgeMaterial))
    mesh.position.copy(placeAt(index % k, layer, Math.floor(index / k)))
    group.add(mesh)
    return { mesh, layer, index }
  })

  const steps = 2 + k
  const apply = (progress: number) => {
    const q1 = clamp01(progress * steps)
    const q2 = clamp01(progress * steps - 1)
    smallEdge.grow(q1)
    segments.forEach((s, i) => s.grow(clamp01(q1 * k - i)))
    tiles.forEach((t, n) => (t.visible = q2 * tiles.length > n && progress * steps < 2.5))
    tileLabel.sprite.visible = q2 >= 1 && progress * steps < 2.5
    let current = -1
    copies.forEach((c) => {
      const q = clamp01(progress * steps - 2 - c.layer)
      c.mesh.visible = q * (k * k) > c.index
      if (q > 0 && q < 1) current = c.layer
      c.mesh.material = c.layer === current ? active : normal
    })
    copyLabel.sprite.visible = progress >= 1 - 1e-6
  }
  apply(0)

  return {
    group,
    bounds: new THREE.Box3(box.min.clone(), new THREE.Vector3(start.x + k * cell.x, Math.max(bigMin.y + k * size.y, start.y + k * cell.y), box.max.z)).union(new THREE.Box3(bigMin, toBig(box.max))),
    apply,
    dispose: () => {
      tileLabel.dispose()
      copyLabel.dispose()
      group.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
  }
}

const avgY = (poly: Polyhedron, vs: number[]) => vs.reduce((s, v) => s + poly.positions[v][1], 0) / vs.length
