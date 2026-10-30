import * as THREE from 'three'
import type { BoxSize } from '../../shared/types.ts'
import type { FaceTree } from '../faceTree.ts'
import type { Polyhedron } from '../polyhedra.ts'
import { clamp01, DONE, growingTube, rightAngleMark, v3 } from './draw.ts'
import type { LessonObject } from './index.ts'
import { diagonalLayout, shortestRoutes } from './pythagorasLayout.ts'

// 피타고라스 설명 (TODO-30). 단계마다 하나만 자라거나 나타나고(ui.md 친절한 설명 원칙), 직각삼각형마다 직각 표시를 붙인다.
// 앞 단계의 빗변은 같은 색으로 남겨서 다음 삼각형의 한 변이 되는 것을 보인다
const DIAGONAL = '#f08c00' // 밑면 대각선 (2단계에서도 같은 색)
const SPACE = '#1c7ed6' // 입체 대각선
const LEG = '#495057' // 직각삼각형의 다른 변 (모서리)
const ROUTE_COLORS = ['#e8590c', '#1c7ed6'] // 최단 거리 후보: 긴 길, 짧은 길

function triangle(points: THREE.Vector3[], material: THREE.Material) {
  return new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(points), material)
}

const tubeMaterial = (color: string) => new THREE.MeshStandardMaterial({ color })
const fillMaterial = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })

// 입체 대각선 (바로 세운 입체): ① 밑면 대각선이 자라고 직각삼각형이 나타남 ② 밑면 대각선과 높이로 세운 직각삼각형이 나타남 ③ 입체 대각선이 자람
export function buildDiagonalLesson(size: BoxSize, radius: number): LessonObject {
  const L = diagonalLayout(size)
  const [p0, p1, p2, p6] = [L.p0, L.p1, L.p2, L.p6].map(v3)
  const r = radius * 0.012
  const mats = { diagonal: tubeMaterial(DIAGONAL), space: tubeMaterial(SPACE), leg: tubeMaterial(LEG), base: fillMaterial(DIAGONAL), stand: fillMaterial(SPACE) }
  const group = new THREE.Group()
  const baseLegs = [growingTube(p0, p1, r * 0.8, mats.leg), growingTube(p1, p2, r * 0.8, mats.leg)]
  const baseDiagonal = growingTube(p0, p2, r, mats.diagonal)
  const height = growingTube(p2, p6, r * 0.8, mats.leg)
  const space = growingTube(p0, p6, r * 1.2, mats.space)
  const baseMark = rightAngleMark(p1, p0.clone().sub(p1), p2.clone().sub(p1), radius * 0.06, r * 0.5, mats.leg)
  const standMark = rightAngleMark(p2, p0.clone().sub(p2), p6.clone().sub(p2), radius * 0.06, r * 0.5, mats.leg)
  const baseFill = triangle([p0, p1, p2], mats.base)
  const standFill = triangle([p0, p2, p6], mats.stand)
  for (const t of [...baseLegs, baseDiagonal, height, space]) group.add(t.mesh)
  group.add(baseMark, standMark, baseFill, standFill)

  const apply = (progress: number) => {
    const [q1, q2, q3] = [0, 1, 2].map((k) => clamp01(progress * 3 - k))
    // ① 두 변(모서리)은 단계가 시작되면 보이고, 빗변(밑면 대각선)이 자란다. 다 자라면 삼각형과 직각 표시
    for (const t of baseLegs) t.grow(q1 > 0 ? 1 : 0)
    baseDiagonal.grow(q1)
    baseFill.visible = baseMark.visible = q1 >= DONE
    mats.base.opacity = q2 > 0 ? 0.12 : 0.3 // 다음 단계로 가면 앞 삼각형은 연하게
    // ② 높이 모서리가 자라고, 다 자라면 세운 삼각형과 직각 표시
    height.grow(q2)
    standFill.visible = standMark.visible = q2 >= DONE
    mats.stand.opacity = 0.25
    // ③ 입체 대각선
    space.grow(q3)
  }
  apply(0)

  return {
    group,
    apply,
    dispose: () => {
      group.removeFromParent()
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      for (const m of Object.values(mats)) m.dispose()
    },
  }
}

// 겉면 최단 거리 (바닥에 펼친 전개도): 후보마다 ① 길이 시작 꼭짓점부터 자람 ② 직각삼각형의 두 변(모서리)과 직각 표시가 나타남.
// 선분은 놓인 면 메시의 자식이라(viewer.md "선분") 접고 펼칠 때 면을 따라온다
export function buildShortestPathLesson(poly: Polyhedron, tree: FaceTree, radius: number): LessonObject {
  const routes = shortestRoutes(poly)
  const meshOf = (face: number) => tree.nodes.find((n) => n.face === face)!.mesh
  const r = radius * 0.012
  const materials: THREE.Material[] = []
  const attached: THREE.Object3D[] = []
  const attach = (face: number, o: THREE.Object3D) => {
    meshOf(face).add(o)
    attached.push(o)
  }
  const built = routes.map((route, k) => {
    const color = ROUTE_COLORS[k % ROUTE_COLORS.length]
    const line = tubeMaterial(color)
    const leg = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.55 })
    materials.push(line, leg)
    const segments = route.segments.map((s) => {
      const t = growingTube(v3(s.from), v3(s.to), r, line)
      attach(s.face, t.mesh)
      return t
    })
    const legs = route.legs.flat().map((s) => {
      const t = growingTube(v3(s.from), v3(s.to), r * 0.7, leg)
      attach(s.face, t.mesh)
      return t
    })
    const { face, at, dirs } = route.corner
    const mark = rightAngleMark(v3(at), v3(dirs[0]), v3(dirs[1]), radius * 0.06, r * 0.5, line)
    attach(face, mark)
    const total = segments.reduce((sum, t) => sum + t.length, 0)
    return {
      apply(qLine: number, qLegs: number) {
        // 길은 시작 꼭짓점에서 끝까지 이어서 자란다 (면을 넘어가도 한 줄)
        let done = 0
        for (const t of segments) {
          t.grow(clamp01((qLine * total - done) / t.length))
          done += t.length
        }
        for (const t of legs) t.grow(qLegs)
        mark.visible = qLegs >= DONE
      },
    }
  })

  const apply = (progress: number) => {
    const n = built.length * 2
    built.forEach((b, k) => b.apply(clamp01(progress * n - 2 * k), clamp01(progress * n - 2 * k - 1)))
  }
  apply(0)

  return {
    group: new THREE.Group(), // 선분은 면 메시에 붙이므로 루트에 붙일 물체는 없다
    apply,
    dispose: () => {
      for (const o of attached) {
        o.removeFromParent()
        o.traverse((c) => (c as THREE.Mesh).geometry?.dispose())
      }
      for (const m of materials) m.dispose()
    },
  }
}
