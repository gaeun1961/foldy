// 아크릴 피라미드 홀로그램 화면 (제안, 팀 합의 전: docs/proposals/hologram/spec.md).
// 도형을 앞·오른쪽·뒤·왼쪽 카메라 4대로 그려 각자의 텍스처에 담고, 화면 가운데 둘레의 사다리꼴 4칸에 붙인다.
// 접기는 책 장면과 같은 면 트리(faceTree.ts)라서 같은 전개도가 같은 순서로 접힌다. 배치 계산은 holoLayout.ts
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { ShapeScene } from '../shared/types.ts'
import { applyUnfold, buildFaceTree, disposeFaceTree, facingYaw, farFirstOrder, layOnFloor, stepUnfold, type FaceTree } from './faceTree.ts'
import { fitDistance, regions, uvOf, type Region } from './holoLayout.ts'
import { foldOrderOf, polyhedronOf, type Polyhedron } from './polyhedra.ts'

export interface HologramProps {
  scene: ShapeScene // 다면체만 (hologramSupported). 바뀌면 다시 만든다
  center?: number // 가운데 정사각형 한 변 / 화면 짧은 변 (피라미드 꼭지 크기, 기본 0.2)
  elevation?: number // 카메라 높이각 (도, 기본 20). 펼칠수록 45°까지 올라간다
  mirror?: boolean // 좌우 반전 (기본 false). 실물에서 거꾸로 보이면 켠다
  spin?: boolean // 세로축으로 천천히 돌기 (기본 true)
  fold?: boolean // 접었다 펴기 반복 (기본 true). false 면 접힌 입체
  showGuide?: boolean // 가운데 정사각형 테두리 = 피라미드 놓을 자리 (기본 true)
  onTap?: () => void // 화면을 누르면 (설정 열기)
}

const FACE_COLORS = ['#5ad1ff', '#ffd25a', '#ff7aa8', '#7dff9a', '#b18cff', '#ff9f5a']
const FOV = 35
// 반복: 펼친 채 → 한 면씩 접기 → 접힌 채 → 한 번에 펼치기 (초)
const HOLD_OPEN = 1.5
const STEP = 0.9
const HOLD_CLOSED = 4
const OPEN = 1.5
const smooth = (t: number) => t * t * (3 - 2 * t)
const pixelRatio = () => Math.min(window.devicePixelRatio, 2) // 휴대폰은 4번 그리므로 2배까지만

type Shape = { tree: FaceTree; poly: Polyhedron; order: number[]; center: THREE.Vector3; rSolid: number; rAll: number; dispose: () => void }

// 1px LineLoop(buildFaceTree 가 붙인 모서리) 대신 굵은 선. 작은 피라미드에서도 보이게
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

function buildShape(scene: ShapeScene, edgeMaterial: LineMaterial): Shape | null {
  const poly = polyhedronOf(scene)
  if (!poly) return null
  // 면마다 색. 바닥에 펼친 전개도는 위에서 안쪽 면이 보이므로 안쪽도 같은 색 (조금 옅게)
  const look = (i: number, side: THREE.Side, opacity: number) =>
    new THREE.MeshBasicMaterial({ color: FACE_COLORS[i % FACE_COLORS.length], transparent: true, opacity, side, depthWrite: false })
  const faceMaterials = poly.faces.map((_, i) => [look(i, THREE.FrontSide, 0.35), look(i, THREE.BackSide, 0.25)])
  const hiddenLoop = new THREE.LineBasicMaterial({ visible: false })
  const tree = buildFaceTree(poly, [faceMaterials[0][0], faceMaterials[0][1]], hiddenLoop)
  tree.nodes.forEach((n) => (n.mesh.material = faceMaterials[n.face]))
  const lines = thickEdges(tree, edgeMaterial)

  // 책 장면과 같은 자세: 전개도를 바닥에 눕히고, 순서가 없는 도형은 앞(+z)에서 먼 면부터 접는다
  const front = new THREE.Vector3(0, 0.6, 1)
  const yaw = poly.foldOrder ? 0 : facingYaw(tree, poly, front)
  layOnFloor(tree, poly, yaw)
  const order = poly.foldOrder ? foldOrderOf(poly) : farFirstOrder(tree, front)

  // 돌리는 축 = 다 접은 입체의 가운데. 접는 동안 차지하는 범위를 미리 재서 카메라 거리를 정한다
  applyUnfold(tree, 0)
  tree.root.updateMatrixWorld(true)
  const center = new THREE.Box3().expandByObject(tree.root).getCenter(new THREE.Vector3())
  tree.root.position.x -= center.x
  tree.root.position.z -= center.z
  center.set(0, center.y, 0)
  // 세로축으로 돌아도 들어가는 반지름: 수평은 축에서 가장 먼 곳, 세로는 높이의 절반
  const radiusOf = (box: THREE.Box3) => {
    const far = Math.max(...[box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => Math.hypot(x, z))))
    return Math.hypot(far, (box.max.y - box.min.y) / 2)
  }
  tree.root.updateMatrixWorld(true)
  const rSolid = radiusOf(new THREE.Box3().expandByObject(tree.root))
  const all = new THREE.Box3()
  const samples = 8 * order.length
  for (let k = 0; k <= samples; k++) {
    applyUnfold(tree, stepUnfold(order, poly.faces.length, 1 - k / samples))
    tree.root.updateMatrixWorld(true)
    all.expandByObject(tree.root)
  }

  return {
    tree,
    poly,
    order,
    center,
    rSolid,
    rAll: radiusOf(all),
    dispose: () => {
      lines.forEach((l) => l.geometry.dispose())
      faceMaterials.flat().forEach((m) => m.dispose())
      hiddenLoop.dispose()
      disposeFaceTree(tree)
    },
  }
}

export function HologramViewer({ scene, center = 0.2, elevation = 20, mirror = false, spin = true, fold = true, showGuide = true, onTap }: HologramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // 설정은 다시 만들지 않고 다음 프레임부터 반영한다 (center·mirror 는 칸을 다시 배치)
  const options = useRef({ center, elevation, mirror, spin, fold, showGuide })
  const relayout = useRef<(() => void) | null>(null)
  const restart = useRef<(() => void) | null>(null)

  useEffect(() => {
    const before = options.current
    options.current = { center, elevation, mirror, spin, fold, showGuide }
    if (before.center !== center || before.mirror !== mirror || before.showGuide !== showGuide) relayout.current?.()
    if (before.fold !== fold) restart.current?.()
  }, [center, elevation, mirror, spin, fold, showGuide])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setClearColor(0x000000, 1)
    container.appendChild(renderer.domElement)

    const world = new THREE.Scene()
    const spinner = new THREE.Group() // 세로축으로 돈다. 원점 = 다 접은 입체의 가운데 (바닥 높이)
    world.add(spinner)
    const cameras = [0, 1, 2, 3].map(() => new THREE.PerspectiveCamera(FOV, 1, 0.01, 1000))
    const edgeMaterial = new LineMaterial({ color: 0xffffff, linewidth: 3 })

    const shape = buildShape(scene, edgeMaterial)
    if (shape) spinner.add(shape.tree.root)

    // 4칸 합성 장면 (화면 픽셀 좌표, 가운데 원점, y 위)
    const composite = new THREE.Scene()
    const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
    let targets: THREE.WebGLRenderTarget[] = []
    let regionList: Region[] = []
    let L = 1
    let c = 0.2

    const clearComposite = () => {
      composite.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineLoop) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
      composite.clear()
      targets.forEach((t) => t.dispose())
    }

    const layout = () => {
      const w = Math.max(1, container.clientWidth)
      const h = Math.max(1, container.clientHeight)
      renderer.setPixelRatio(pixelRatio())
      renderer.setSize(w, h)
      Object.assign(screenCamera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 })
      screenCamera.updateProjectionMatrix()

      const o = options.current
      L = Math.min(w, h)
      c = L * o.center
      regionList = regions(L, c)
      const tw = Math.round(L * pixelRatio())
      const th = Math.max(1, Math.round(((L - c) / 2) * pixelRatio()))

      clearComposite()
      targets = regionList.map((region) => {
        const target = new THREE.WebGLRenderTarget(tw, th, { samples: 4 })
        const [a, b, cc, d] = region.corners
        const tri = [a, b, cc, a, cc, d]
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap((p) => [p[0], p[1], 0]), 3))
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(tri.flatMap((p) => uvOf(region, L, c, p, o.mirror)), 2))
        composite.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: target.texture, side: THREE.DoubleSide })))
        return target
      })
      for (const camera of cameras) {
        camera.aspect = tw / th
        camera.updateProjectionMatrix()
      }
      edgeMaterial.resolution.set(tw, th)
      edgeMaterial.linewidth = Math.max(2, (L * pixelRatio()) / 220)

      if (o.showGuide) {
        composite.add(
          new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(regionList.map((r) => new THREE.Vector3(r.corners[0][0], r.corners[0][1], 0))),
            new THREE.LineBasicMaterial({ color: 0x444444 }),
          ),
        )
      }
    }
    relayout.current = layout

    let cycleStart = performance.now()
    restart.current = () => (cycleStart = performance.now())
    const unfoldAt = (now: number): { values: number | number[]; s: number } => {
      if (!shape || !options.current.fold) return { values: 0, s: 0 }
      const folding = STEP * shape.order.length
      const t = ((now - cycleStart) / 1000) % (HOLD_OPEN + folding + HOLD_CLOSED + OPEN)
      if (t < HOLD_OPEN) return { values: 1, s: 1 }
      if (t < HOLD_OPEN + folding) {
        const s = 1 - (t - HOLD_OPEN) / folding
        return { values: stepUnfold(shape.order, shape.poly.faces.length, s), s }
      }
      if (t < HOLD_OPEN + folding + HOLD_CLOSED) return { values: 0, s: 0 }
      const s = smooth((t - HOLD_OPEN - folding - HOLD_CLOSED) / OPEN)
      return { values: s, s }
    }

    let open = 0 // 펼친 정도를 부드럽게 따라가는 값 (카메라 거리·높이)
    let last = performance.now()
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (shape) {
        const o = options.current
        const { values, s } = unfoldAt(now)
        applyUnfold(shape.tree, values)
        if (o.spin) spinner.rotation.y += dt * 0.35
        // 다 접히면 입체 쪽으로 당겨 크게 보고, 펼칠수록 물러나며 위에서 내려다본다 (바닥에 누운 전개도가 납작하지 않게)
        open += (Math.min(1, s * 1.5) - open) * Math.min(1, dt * 3)
        const distance = fitDistance(L, c, THREE.MathUtils.lerp(shape.rSolid, shape.rAll, open), FOV)
        const el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(o.elevation, Math.max(o.elevation, 45), open))
        regionList.forEach((region, k) => {
          const camera = cameras[k]
          const target = shape.center
          camera.position.set(
            target.x + distance * Math.cos(el) * Math.sin(region.azimuth),
            target.y + distance * Math.sin(el),
            target.z + distance * Math.cos(el) * Math.cos(region.azimuth),
          )
          camera.lookAt(target)
          renderer.setRenderTarget(targets[k])
          renderer.render(world, camera)
        })
      }
      renderer.setRenderTarget(null)
      renderer.render(composite, screenCamera)
    })

    const observer = new ResizeObserver(layout)
    observer.observe(container)
    layout()

    return () => {
      observer.disconnect()
      renderer.setAnimationLoop(null)
      relayout.current = null
      restart.current = null
      shape?.dispose()
      edgeMaterial.dispose()
      clearComposite()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [scene])

  return <div ref={containerRef} className="hologram-viewer" onClick={onTap} />
}
