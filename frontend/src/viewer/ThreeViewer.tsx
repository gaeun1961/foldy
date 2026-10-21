import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import { applyUnfold, buildFaceTree, disposeFaceTree } from './faceTree.ts'
import { polyhedronOf } from './polyhedra.ts'

// three.js 뷰어: 다면체를 면 트리(polyhedra.ts)로 그리고 마우스로 돌려 볼 수 있다.
// TODO(3D): 접기 슬라이더(TODO-3), 선(TODO-4), 하이라이트(TODO-5), 곡면 도형(TODO-17)
export function ThreeViewer({ scene }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
    // 임시 확인용: 주소에 ?s=1 을 붙이면 펼친 상태로 그린다. TODO-3 에서 슬라이더·props 로 바꾼다
    applyUnfold(tree, Number(new URLSearchParams(location.search).get('s') ?? 0))
    world.add(tree.root)
    world.add(new THREE.AmbientLight('#ffffff', 1.6))
    const light = new THREE.DirectionalLight('#ffffff', 1.8)
    light.position.set(5, 10, 7)
    world.add(light)

    // 지금 그려진 모양(입체 또는 펼친 전개도)의 가운데를 보고, 전체가 화면에 들어오는 거리에 카메라를 둔다
    const bounds = new THREE.Box3().setFromObject(tree.root)
    const center = bounds.getCenter(new THREE.Vector3())
    const far = bounds.getSize(new THREE.Vector3()).length() * 1.8
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.copy(center).add(new THREE.Vector3(0.45, 0.4, 0.8).multiplyScalar(far))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    controls.enableDamping = true

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(world, camera)
    })

    return () => {
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
