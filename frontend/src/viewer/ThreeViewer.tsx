import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import { applyUnfold, buildFaceTree, disposeFaceTree, type FaceTree } from './faceTree.ts'
import { polyhedronOf } from './polyhedra.ts'

// three.js 뷰어: 다면체를 면 트리(polyhedra.ts)로 그리고, unfold 값만큼 펼친다. 마우스로 돌려 볼 수 있다.
// TODO(3D): 선(TODO-4), 하이라이트(TODO-5), 맞닿는 모서리 색(TODO-22), 곡면 도형(TODO-17)
export function ThreeViewer({ scene, unfold = 0 }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<FaceTree | null>(null)
  const unfoldRef = useRef(unfold) // 도형을 새로 만들 때 지금 펼침 값으로 시작하려고

  // unfold 만 바뀌면 다시 만들지 않고 회전만 바꾼다. 아래 도형 만들기 effect 보다 먼저 돈다
  useEffect(() => {
    unfoldRef.current = unfold
    if (treeRef.current) applyUnfold(treeRef.current, unfold)
  }, [unfold])

  useEffect(() => {
    const poly = polyhedronOf(scene)
    if (!poly) return // 곡면 도형·아직 데이터가 없는 도형
    const container = containerRef.current!

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const world = new THREE.Scene()
    world.background = new THREE.Color('#f5f3ef')

    // 면은 흰색·연한 회색, 모서리는 진한 회색 (docs/specs/ui.md)
    const faceMaterial = new THREE.MeshStandardMaterial({
      color: '#f4f5f7',
      side: THREE.DoubleSide,
      polygonOffset: true, // 모서리 선이 면에 묻혀 깜빡이지 않게
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
    const tree = buildFaceTree(poly, faceMaterial, edgeMaterial)
    world.add(tree.root)
    world.add(new THREE.AmbientLight('#ffffff', 1.6))
    const light = new THREE.DirectionalLight('#ffffff', 1.8)
    light.position.set(5, 10, 7)
    world.add(light)

    // 다 접은 모양과 다 펼친 모양을 모두 담는 범위의 가운데를 보고, 전체가 화면에 들어오는 거리에 둔다.
    // 그래서 펼치고 접는 동안 카메라를 옮기지 않아도 화면 밖으로 나가지 않는다
    const bounds = new THREE.Box3()
    for (const s of [0, 1]) {
      applyUnfold(tree, s)
      bounds.expandByObject(tree.root)
    }
    applyUnfold(tree, unfoldRef.current)
    treeRef.current = tree
    const center = bounds.getCenter(new THREE.Vector3())
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.copy(center).add(new THREE.Vector3(0.45, 0.4, 0.8))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    controls.enableDamping = true

    // 화면 비율이 바뀌면(휴대폰 세로 등) 가로·세로 중 좁은 시야에 맞춰 거리를 다시 잡는다. 보는 방향은 유지
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const vfov = THREE.MathUtils.degToRad(camera.fov)
      const fov = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect))
      const dir = camera.position.clone().sub(controls.target).normalize()
      camera.position.copy(controls.target).addScaledVector(dir, (radius / Math.sin(fov / 2)) * 1.05)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(world, camera)
    })

    return () => {
      treeRef.current = null
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.dispose()
      disposeFaceTree(tree)
      faceMaterial.dispose()
      edgeMaterial.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [scene])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
