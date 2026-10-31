// 무대 (docs/specs/viewer.md "홀로그램" 무대): 장면 + 3D 디자인 토큰 → 바닥에 놓인 도형 물체 하나.
// 도형 종류(다면체 면 트리, 원기둥·원뿔 말기, 구)는 여기서만 갈린다. 보는 쪽(홀로그램의 카메라 4대, 나중에는 책 장면)은
// 무대를 받아 비추기만 하고 도형을 모른다. 그래서 도형이 늘거나 디자인(theme.ts)이 바뀌면 보는 쪽은 그대로 따라온다.
//
// 지금은 홀로그램만 쓴다. 책 장면(ThreeViewer·CurvedViewer)은 선 긋기·면 고르기·라벨·설명 모드가 얽혀 있어서
// 뷰어 담당과 합의한 뒤 옮긴다 (viewer.md "홀로그램" 다음 단계). 같은 조립 함수와 토큰을 쓰므로 모양과 접는 순서는 이미 같다
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { ShapeScene } from '../shared/types.ts'
import { VIEW_DIR } from './bookScene.ts'
import { buildCurvedNet, curvedLineRadius, roundSizeOf, seamOf, type CurvedShape } from './curved.ts'
import { applyUnfold, buildFaceTree, disposeFaceTree, facingYaw, farFirstOrder, layOnFloor, stepUnfold, type FaceTree } from './faceTree.ts'
import { buildSphereBody } from './lessons/sphereLessons.ts'
import { foldOrderOf, polyhedronOf } from './polyhedra.ts'
import type { Theme3D } from './theme.ts'

export interface Stage {
  object: THREE.Group // 바닥(y = 0)에 놓인 도형. 원점 = 다 접은 입체의 수평 가운데 (세로축으로 돌리면 제자리에서 돈다)
  steps: number // 단계별 접기 단계 수. 0 이면 한 번에만 접힌다 (원기둥·원뿔) 또는 접지 않는다 (구)
  order: number[] // 단계별로 접는 면 순서 (책 장면과 같다). 곡면 도형·구는 빈 배열
  foldable: boolean // 접고 펴는 도형인지 (구는 false)
  apply(s: number, mode?: 'all' | 'step'): void // 펼침 값 s: 0 = 입체, 1 = 전개도 (viewer.md 와 같은 뜻)
  solid: THREE.Box3 // 다 접은 입체의 범위
  all: THREE.Box3 // 접고 펴는 동안 차지하는 전체 범위 (단계별 중간 모양 포함)
  resize(width: number, height: number): void // 굵은 선(theme.edgeWidth > 0)을 그리는 화면 크기 (기기 픽셀)
  dispose(): void
}

// 무대가 그릴 수 있는 도형인지. 다면체(면 트리, 면이 2개 이상), 원기둥·원뿔, 구.
// 면이 하나뿐인 학습지 전개도(전개도 고르기 문제 등)는 접을 입체가 없어서 false. 학습지에서 모르는 도형이 와도 false 라서 홀로그램 버튼이 꺼진다
export function stageSupported(scene: ShapeScene) {
  const poly = polyhedronOf(scene)
  if (poly) return poly.faces.length >= 2
  return scene.shape === 'cylinder' || scene.shape === 'cone' || scene.shape === 'sphere'
}


function faceMaterial(color: string, side: THREE.Side, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, side, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
}

// 꼭짓점으로 잰 범위. Box3.expandByObject 는 기울어진 면의 상자를 다시 돌려 담아서 실제보다 크다
// (펼친 전개도도 두께가 생기고, 다 접은 입체가 바닥 아래로 내려가 보인다). 굵은 선(Line2)은 면 모서리와 같은 자리라 건너뛰고,
// 인스턴스로 그린 관(InstancedMesh, 곡면 선)은 조각마다 작은 상자를 담는다
export function boundsOf(object: THREE.Object3D) {
  const box = new THREE.Box3()
  const p = new THREE.Vector3()
  object.updateMatrixWorld(true)
  object.traverse((o) => {
    if (!o.visible && o !== object) return
    if (o instanceof Line2) return
    if (o instanceof THREE.InstancedMesh) {
      // 조각마다 따로 (묶음 상자를 돌리면 원 둘레 같은 선이 위아래로 부푼다)
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
      const piece = o.geometry.boundingBox!
      const m = new THREE.Matrix4()
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m)
        box.union(piece.clone().applyMatrix4(m.premultiply(o.matrixWorld)))
      }
      return
    }
    const position = (o as THREE.Mesh).geometry?.getAttribute?.('position')
    if (!(o instanceof THREE.Mesh || o instanceof THREE.Line) || !position) return
    for (let i = 0; i < position.count; i++) box.expandByPoint(p.fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld))
  })
  return box
}

// 접고 펴는 동안의 범위: 한 단계를 8 칸으로 나눠 면이 휘두르며 지나가는 곳까지 담는다 (ThreeViewer 와 같은 방법)
function sweep(object: THREE.Object3D, apply: (s: number) => void, samples: number) {
  const box = new THREE.Box3()
  for (let k = 0; k <= samples; k++) {
    apply(1 - k / samples)
    box.union(boundsOf(object))
  }
  return box
}

// 다 접은 입체의 수평 가운데를 원점으로, 가장 낮은 곳을 바닥(y = 0)으로 옮기고 범위를 잰다
// (곡면 도형은 밑면 둘레 선이 굵기가 있는 관이라 그만큼 올린다)
function settle(object: THREE.Group, inner: THREE.Object3D, apply: (s: number) => void, samples: number) {
  apply(0)
  const placed = boundsOf(inner)
  const center = placed.getCenter(new THREE.Vector3())
  inner.position.x -= center.x
  inner.position.z -= center.z
  inner.position.y -= placed.min.y
  const solid = boundsOf(object)
  const all = sweep(object, apply, samples).union(solid)
  apply(0)
  return { solid, all }
}

// 1px LineLoop(buildFaceTree 가 붙인 모서리) 위에 굵은 선. 작은 화면(홀로그램)에서도 보이게
function thickEdges(tree: FaceTree, material: LineMaterial) {
  const lines: Line2[] = []
  for (const n of tree.nodes) {
    for (const child of [...n.mesh.children]) {
      if (!(child instanceof THREE.LineLoop)) continue
      const p = (child.geometry as THREE.BufferGeometry).getAttribute('position')
      const points: number[] = []
      for (let i = 0; i <= p.count; i++) points.push(p.getX(i % p.count), p.getY(i % p.count), p.getZ(i % p.count))
      const line = new Line2(new LineGeometry().setPositions(points), material)
      n.mesh.add(line)
      child.visible = false
      lines.push(line)
    }
  }
  return lines
}

function polyhedronStage(scene: ShapeScene, theme: Theme3D): Stage | null {
  const poly = polyhedronOf(scene)
  if (!poly) return null
  const normal = theme.looks.normal
  // 면 색: 팔레트가 있으면 면마다 돌려 쓴다. 바닥에 펼친 전개도는 위에서 안쪽 면이 보이므로 안쪽도 같은 색 (조금 옅게)
  const faceMaterials = poly.faces.map((_, i) => {
    const color = theme.facePalette?.[i % theme.facePalette.length]
    return [faceMaterial(color ?? normal.outside, THREE.FrontSide, normal.opacity), faceMaterial(color ?? normal.inside, THREE.BackSide, color ? normal.opacity * 0.7 : normal.opacity)]
  })
  const thick = theme.edgeWidth > 0
  const edgeMaterial = new THREE.LineBasicMaterial({ color: normal.edge, visible: !thick })
  const tree = buildFaceTree(poly, [faceMaterials[0][0], faceMaterials[0][1]], edgeMaterial)
  tree.nodes.forEach((n) => (n.mesh.material = faceMaterials[n.face]))
  const lineMaterial = thick ? new LineMaterial({ color: normal.edge, linewidth: 2 }) : null
  const lines = lineMaterial ? thickEdges(tree, lineMaterial) : []

  // 책 장면과 같은 자세: 전개도를 바닥에 눕히고, 순서가 없는 도형은 앞에서 먼 면부터 접는다
  const yaw = poly.foldOrder ? 0 : facingYaw(tree, poly, VIEW_DIR)
  layOnFloor(tree, poly, yaw)
  const order = poly.foldOrder ? foldOrderOf(poly) : farFirstOrder(tree, VIEW_DIR)
  const object = new THREE.Group()
  object.add(tree.root)
  const apply = (s: number, mode: 'all' | 'step' = 'step') => applyUnfold(tree, mode === 'step' ? stepUnfold(order, poly.faces.length, s) : s)
  const { solid, all } = settle(object, tree.root, (s) => apply(s), 8 * order.length)

  return {
    object,
    steps: order.length,
    order,
    foldable: true,
    apply,
    solid,
    all,
    resize(width, height) {
      if (!lineMaterial) return
      lineMaterial.resolution.set(width, height)
      lineMaterial.linewidth = Math.max(2, Math.min(width, height) * theme.edgeWidth)
    },
    dispose() {
      object.removeFromParent()
      lines.forEach((l) => l.geometry.dispose())
      lineMaterial?.dispose()
      faceMaterials.flat().forEach((m) => m.dispose())
      edgeMaterial.dispose()
      disposeFaceTree(tree)
    },
  }
}

// 원기둥·원뿔(말기)과 구. 선은 굵기가 있는 관(thickLine)이라 화면 크기와 상관없다
function roundStage(scene: ShapeScene, theme: Theme3D): Stage | null {
  if (scene.shape !== 'cylinder' && scene.shape !== 'cone' && scene.shape !== 'sphere') return null
  const sphere = scene.shape === 'sphere'
  const size = roundSizeOf(scene)
  const normal = theme.looks.normal
  const faces: [THREE.Material, THREE.Material] = [faceMaterial(normal.outside, THREE.FrontSide, normal.opacity), faceMaterial(normal.inside, THREE.BackSide, normal.opacity)]
  // 선 관 굵기는 책 장면과 같은 식, 굵은 선 테마(홀로그램)는 두 배
  const lineRadius = curvedLineRadius(size, theme.edgeWidth > 0 ? 2 : 1)
  const net = sphere ? buildSphereBody(size.radius, faces[0], theme.sphereRing) : buildCurvedNet(scene.shape as CurvedShape, size, faces, lineRadius, [], seamOf(scene), theme.curved) // 그은 선은 그리지 않는다 (viewer.md "홀로그램")
  net.setPaired(true)
  const object = new THREE.Group()
  object.add(net.group)
  const { solid, all } = settle(object, net.group, (s) => net.apply(s), sphere ? 1 : 16)

  return {
    object,
    steps: 0,
    order: [],
    foldable: !sphere,
    apply: (s) => net.apply(s),
    solid,
    all,
    resize() {},
    dispose() {
      object.removeFromParent()
      net.dispose()
      faces.forEach((m) => m.dispose())
    },
  }
}

export function buildStage(scene: ShapeScene, theme: Theme3D): Stage | null {
  return polyhedronStage(scene, theme) ?? roundStage(scene, theme)
}
