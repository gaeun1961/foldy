import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'

// three.js 최소 구현: 직육면체를 띄우고 마우스로 돌려 볼 수 있다.
// TODO(3D): 꼭짓점 라벨, 면 위 선분(scene.lines), 전개도 접기 애니메이션
export function ThreeViewer({ scene }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // TODO(3D): 지금은 직육면체·정육면체만. 다른 도형은 면 트리(TODO-2)·곡면 모듈에서
    if (scene.shape !== 'cuboid' && scene.shape !== 'cube') return
    const container = containerRef.current!
    const { width, depth, height } =
      scene.shape === 'cube' ? { width: scene.size.edge, depth: scene.size.edge, height: scene.size.edge } : scene.size

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const world = new THREE.Scene()
    world.background = new THREE.Color('#f5f7fb')

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    const far = Math.max(width, depth, height) * 2.5
    camera.position.set(far, far * 0.8, far)

    const geometry = new THREE.BoxGeometry(width, height, depth)
    const box = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: '#8ab4f8', transparent: true, opacity: 0.6 }),
    )
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: '#1a3a6b' }),
    )
    world.add(box, edges)
    world.add(new THREE.AmbientLight('#ffffff', 1.5))
    const light = new THREE.DirectionalLight('#ffffff', 2)
    light.position.set(5, 10, 7)
    world.add(light)

    const controls = new OrbitControls(camera, renderer.domElement)
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
      geometry.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [scene])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
