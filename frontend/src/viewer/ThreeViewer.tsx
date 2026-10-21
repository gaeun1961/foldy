import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import { applyUnfold, buildFaceTree, disposeFaceTree, layOnFloor, type FaceTree } from './faceTree.ts'
import { polyhedronOf } from './polyhedra.ts'

// three.js 뷰어: 다면체를 면 트리(polyhedra.ts)로 그려 바닥에 눕히고, unfold 값만큼 펼친다. 마우스로 돌려 볼 수 있다.
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
    renderer.shadowMap.enabled = true // 기본 PCF. 가장자리는 light.shadow.radius 로 흐리게
    container.appendChild(renderer.domElement)

    const world = new THREE.Scene()
    world.background = new THREE.Color('#f5f3ef')

    // 면 바깥은 흰색, 안쪽은 아주 연한 하늘색, 모서리는 진한 회색 (docs/specs/ui.md 색 기준)
    const faceStyle = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 } // 모서리 선이 면에 묻혀 깜빡이지 않게
    const outsideMaterial = new THREE.MeshStandardMaterial({ ...faceStyle, color: '#ffffff', side: THREE.FrontSide })
    const insideMaterial = new THREE.MeshStandardMaterial({ ...faceStyle, color: '#e3f1fb', side: THREE.BackSide })
    const edgeMaterial = new THREE.LineBasicMaterial({ color: '#3c4048' })
    const tree = buildFaceTree(poly, [outsideMaterial, insideMaterial], edgeMaterial)
    layOnFloor(tree, poly) // 전개도를 바닥에 눕힌다. 접으면 면이 위로 일어선다 (docs/specs/viewer.md)
    world.add(tree.root)

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

    // 밝고 부드러운 조명: 위아래 은은한 환경광 + 비스듬한 위쪽 빛 하나(그림자)
    world.add(new THREE.HemisphereLight('#ffffff', '#efe9df', 1.8))
    const light = new THREE.DirectionalLight('#ffffff', 1.4)
    light.position.copy(center).add(new THREE.Vector3(-0.4, 1, 0.5).multiplyScalar(radius * 3))
    light.target.position.copy(center)
    light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    light.shadow.radius = 4
    light.shadow.bias = -0.0005
    Object.assign(light.shadow.camera, { left: -radius * 1.5, right: radius * 1.5, top: radius * 1.5, bottom: -radius * 1.5, far: radius * 6 })
    world.add(light, light.target)

    // 바닥: 옅은 격자 + 그림자만 받는 투명한 판. 전개도와 겹쳐 깜빡이지 않게 아주 조금 아래에 둔다
    const floorY = -radius * 0.002
    const grid = new THREE.GridHelper(Math.ceil(radius * 8), Math.ceil(radius * 8), '#e4ded4', '#e4ded4')
    grid.position.set(center.x, floorY, center.z)
    const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 8, radius * 8), new THREE.ShadowMaterial({ opacity: 0.12 }))
    shadowFloor.rotation.x = -Math.PI / 2
    shadowFloor.position.set(center.x, floorY, center.z)
    shadowFloor.receiveShadow = true
    world.add(grid, shadowFloor)

    // 비스듬히 위에서 내려다보는 구도 (수평에서 약 40°, 시안 net-folding-ref.png). 거리는 아래 resize 에서 잡는다
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.copy(center).add(new THREE.Vector3(0.5, 0.9, 1))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(center)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.05 // 바닥 아래로는 돌아가지 않게

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
      for (const m of [outsideMaterial, insideMaterial, edgeMaterial, shadowFloor.material, grid.material]) m.dispose()
      shadowFloor.geometry.dispose()
      grid.geometry.dispose()
      light.shadow.map?.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [scene])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
