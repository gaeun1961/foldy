import * as THREE from 'three'
import type { BoxSize } from '../../shared/types.ts'
import { clamp01, DONE, growingTube, v3 } from './draw.ts'
import type { LessonObject } from './index.ts'
import { similarLayout, similarSteps } from './similarLayout.ts'

// 닮음 설명 (TODO-29, 바로 세운 입체). 원래 직육면체 옆에 k배 직육면체 틀을 두고
// ① 길이: k배 모서리에 원래 모서리를 k개 이어 붙인다 ② 한 면: k배 앞면에 원래 앞면을 k × k 장 깐다
// ③ 부피: 원래 직육면체를 k³ 개 한 층씩 채운다. 넓이·부피는 "몇 배"를 계산 대신 세게 한다 (리포트 T29 참고 자료)
const PIECE = ['#f08c00', '#1c7ed6'] // 이어 붙이는 원래 모서리: 번갈아 두 색 (몇 개인지 세기 쉽게)
const TILE = '#ffd982' // 원래 앞면, 깐 면
const ACTIVE = '#ffe8a8' // 지금 채우는 층 (부피 설명과 같은 연한 노랑)

export function buildSimilarLesson(size: BoxSize, k: number, radius: number): LessonObject {
  const L = similarLayout(size, k)
  const [w, h, d] = L.size
  const r = radius * 0.012
  const group = new THREE.Group()
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
  const pieceMaterials = PIECE.map((color) => new THREE.MeshStandardMaterial({ color }))
  const tileMaterial = new THREE.MeshStandardMaterial({ color: TILE, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  const boxMaterials = { normal: new THREE.MeshStandardMaterial({ color: '#ffffff' }), active: new THREE.MeshStandardMaterial({ color: ACTIVE }) }
  const materials = [edgeMaterial, ...pieceMaterials, tileMaterial, boxMaterials.normal, boxMaterials.active]

  // k배 직육면체의 틀 (모서리만)
  const bigBox = new THREE.Box3(v3(L.big.min), v3(L.big.max))
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...bigBox.getSize(new THREE.Vector3()).toArray())), edgeMaterial)
  frame.position.copy(bigBox.getCenter(new THREE.Vector3()))
  group.add(frame)

  // ① 길이
  const edge = growingTube(v3(L.edge.from), v3(L.edge.to), r * 1.3, pieceMaterials[0])
  const pieces = L.segments.map((s, i) => growingTube(v3(s.from), v3(s.to), r * 1.3, pieceMaterials[i % 2]))
  group.add(edge.mesh, ...pieces.map((p) => p.mesh))

  // ② 한 면: 원래 앞면(같은 색)과 깔 면들. 면마다 테두리를 둬서 장수를 셀 수 있게
  const plate = (center: THREE.Vector3) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.94), tileMaterial) // 장 사이 틈 (몇 장인지 세게)
    mesh.position.copy(center)
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMaterial))
    group.add(mesh)
    return mesh
  }
  const ownFace = plate(new THREE.Vector3(0, 0, d / 2))
  const tiles = L.tiles.map((t) => plate(v3(t.center)))

  // ③ 부피
  const boxGeometry = new THREE.BoxGeometry(w * 0.97, h * 0.97, d * 0.97) // 조각 사이 틈 (하나하나 보이게)
  const boxEdges = new THREE.EdgesGeometry(boxGeometry)
  const boxes = L.boxes.map((b) => {
    const mesh = new THREE.Mesh(boxGeometry, boxMaterials.normal)
    mesh.position.copy(v3(b.center))
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(boxEdges, edgeMaterial))
    group.add(mesh)
    return mesh
  })

  const apply = (progress: number) => {
    const n = similarSteps(k)
    const q = Array.from({ length: n }, (_, s) => clamp01(progress * n - s))
    // ① 원래 모서리가 먼저 보이고, k배 모서리에 하나씩 이어 붙는다
    edge.grow(q[0] > 0 ? 1 : 0)
    pieces.forEach((p, i) => p.grow(clamp01(q[0] * k - i)))
    // ② 원래 앞면이 보이고, k배 앞면에 한 장씩 깔린다. 부피 단계로 가면 치운다 (조각을 가리지 않게)
    const tilesOn = q[1] > 0 && q[2] <= 0
    ownFace.visible = tilesOn
    tiles.forEach((t, i) => {
      const s = clamp01(q[1] * tiles.length - i)
      t.visible = tilesOn && s > 0
      t.scale.setScalar(Math.max(s, 1e-3))
    })
    // ③ 층마다 한 단계. 지금 채우는 층을 강조하고, 층 사이에 멈추면 마지막 층, 끝에서는 끈다
    const layers = q.slice(2)
    let current = layers.findIndex((x) => x > 0 && x < DONE)
    if (current < 0 && progress > 0 && progress < DONE) current = layers.filter((x) => x >= DONE).length - 1
    L.boxes.forEach((b, i) => {
      const s = clamp01(layers[b.layer] * L.perLayer - b.index)
      boxes[i].visible = s > 0
      boxes[i].scale.setScalar(Math.max(s, 1e-3))
      boxes[i].material = b.layer === current ? boxMaterials.active : boxMaterials.normal
    })
  }
  apply(0)

  // 카메라가 담을 범위: 원래 직육면체와 k배 직육면체
  const bounds = new THREE.Box3(new THREE.Vector3(-w / 2, -h / 2, -d / 2), new THREE.Vector3(w / 2, h / 2, d / 2)).union(bigBox)

  return {
    group,
    bounds,
    apply,
    dispose: () => {
      group.removeFromParent()
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      boxGeometry.dispose()
      boxEdges.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
