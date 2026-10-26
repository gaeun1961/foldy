import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewerProps } from '.'
import type { Line, PolyhedronPoint } from '../shared/types.ts'
import { applyUnfold, buildFaceTree, disposeFaceTree, layOnFloor, placeLines, stepUnfold } from './faceTree.ts'
import { foldOrderOf, matchingEdges, polyhedronOf } from './polyhedra.ts'

const MOVING = 1e-6 // 이 값보다 0·1 에서 떨어져 있어야 "접히는 중" (단계 경계의 부동소수 오차 무시)
// 맞닿는 모서리 쌍 색: 빨강, 주황, 노랑, 초록, 청록, 파랑, 보라 (ui.md 색 기준). 쌍이 더 많으면 돌려 쓴다
const PAIR_COLORS = ['#e5484d', '#f76b15', '#e2a400', '#30a46c', '#12a594', '#3e63dd', '#8e4ec6']

// 선을 화면 위치는 그대로 두고 깊이만 카메라 쪽으로 pull.value 만큼 당긴다 (시선 방향으로 당기면 화면 위치가 안 바뀐다).
// 보이는 모서리가 면과 깊이를 다투면 그래픽 카드마다 점선·실선이 깜빡여서, polygonOffset 대신 거리로 여유를 준다
function pullTowardCamera<M extends THREE.Material>(material: M, pull: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPull = pull
    shader.vertexShader =
      'uniform float uPull;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nmvPosition.xyz *= max(0.0, 1.0 - uPull / length(mvPosition.xyz));\ngl_Position = projectionMatrix * mvPosition;',
      )
  }
  return material
}

// three.js 뷰어: 다면체를 면 트리(polyhedra.ts)로 그려 바닥에 눕히고, unfold 값만큼 펼친다. 마우스로 돌려 볼 수 있다.
// 단계별 접기(foldMode = 'step')는 면을 하나씩 접고 지금 접히는 면을 강조한다 (docs/specs/viewer.md)
// 가려진 모서리는 점선 (showHiddenEdges), 맞닿는 모서리 쌍은 같은 색이고 누르면 쌍이 함께 굵어진다 (showMatchingEdges)
// 면 위 선분(scene.lines)은 면 메시의 자식이라 접힘을 따라간다
// TODO(3D): 하이라이트(TODO-5), 곡면 도형(TODO-17)
export function ThreeViewer({ scene, unfold = 0, foldMode = 'all', showHiddenEdges = true, showMatchingEdges = true }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef({ unfold, foldMode, showHiddenEdges, showMatchingEdges }) // 도형을 새로 만들 때 지금 값으로 시작하려고
  const applyRef = useRef<(() => void) | null>(null)

  // unfold·foldMode·보기 옵션만 바뀌면 다시 만들지 않고 회전·강조·표시만 바꾼다. 아래 도형 만들기 effect 보다 먼저 돈다
  useEffect(() => {
    viewRef.current = { unfold, foldMode, showHiddenEdges, showMatchingEdges }
    applyRef.current?.()
  }, [unfold, foldMode, showHiddenEdges, showMatchingEdges])

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
    const pull = { value: 0 } // 모서리 선을 카메라 쪽으로 당기는 거리. 도형 크기를 안 뒤에 정한다 (pullTowardCamera)
    // 단계별 접기에서는 지금 접히는 면을 연한 노랑, 나머지를 배경에 가까운 색으로 (ui.md 색 기준)
    const look = (outside: string, inside: string, edge: string) => ({
      faces: [
        new THREE.MeshStandardMaterial({ ...faceStyle, color: outside, side: THREE.FrontSide }),
        new THREE.MeshStandardMaterial({ ...faceStyle, color: inside, side: THREE.BackSide }),
      ] as [THREE.Material, THREE.Material],
      // 실선은 깊이를 쓰지 않는다. 쓰면 같은 자리의 점선이 실선 깊이와 미세하게 달라 보이는 모서리에서도 깜빡인다
      edge: pullTowardCamera(new THREE.LineBasicMaterial({ color: edge, depthWrite: false }), pull),
    })
    const looks = {
      normal: look('#ffffff', '#e3f1fb', '#3c4048'),
      active: look('#ffe8a8', '#ffd982', '#3c4048'),
      faded: look('#f1eee8', '#ebe8e2', '#b9bdc4'),
    }
    const tree = buildFaceTree(poly, looks.normal.faces, looks.normal.edge)
    layOnFloor(tree, poly) // 전개도를 바닥에 눕힌다. 접으면 면이 위로 일어선다 (docs/specs/viewer.md)
    world.add(tree.root)
    const order = foldOrderOf(poly)

    // 다 접은 모양, 다 펼친 모양, 두 방식의 중간 모양을 모두 담는 범위의 가운데를 보고, 전체가 화면에 들어오는 거리에 둔다.
    // 그래서 펼치고 접는 동안 카메라를 옮기지 않아도 화면 밖으로 나가지 않는다 (단계별 중간 모양은 더 높이 솟을 수 있다)
    // 한 단계를 8 칸으로 나눠 본다 (면이 휘두르며 지나가는 가장 높은 곳까지 담으려고)
    const bounds = new THREE.Box3()
    const samples = 8 * order.length
    for (let k = 0; k <= samples; k++) {
      const s = 1 - k / samples
      for (const values of [s, stepUnfold(order, poly.faces.length, s)]) {
        applyUnfold(tree, values)
        bounds.expandByObject(tree.root)
      }
    }
    const center = bounds.getCenter(new THREE.Vector3())
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius

    // 회전축 모서리를 굵게: 붙는 모서리를 따라 가는 원기둥. pivot 에 붙이면 축 위에 있어서 회전해도 그 자리다
    const barMaterial = new THREE.MeshBasicMaterial({ color: '#3c4048' })
    const bars = new Map<number, THREE.Mesh>()
    for (const n of tree.nodes) {
      if (!n.pivot) continue
      const [a, b] = poly.faces[n.face].hinge!.map((i) => new THREE.Vector3(...poly.positions[i]))
      const length = a.distanceTo(b)
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.012, radius * 0.012, length, 12), barMaterial)
      bar.position.copy(n.axis!).multiplyScalar(length / 2)
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.axis!)
      bar.visible = false
      n.pivot.add(bar)
      bars.set(n.face, bar)
    }

    // 면 위 선분: 면 메시의 자식으로 붙여 접고 펼 때 따라오게 한다. 1px 선은 잘 안 보여서 가는 원기둥으로 (viewer.md "선분")
    const lineMaterial = new THREE.MeshBasicMaterial({ color: '#e64980' })
    placeLines(poly, scene.lines as Line<PolyhedronPoint>[]).forEach((placed, k) => {
      if (!placed) return console.warn(`foldy: lines[${k}] 의 두 끝점이 같은 면 위에 없어서 그리지 않습니다`, scene.lines[k])
      const [from, to] = [new THREE.Vector3(...placed.from), new THREE.Vector3(...placed.to)]
      // 양 끝을 굵기만큼 줄인다. 꼭짓점·모서리에서 끝나는 선이 접은 입체 밖으로 삐져나오지 않게
      const length = Math.max(0, from.distanceTo(to) - 2 * radius * 0.01)
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.01, radius * 0.01, length, 12), lineMaterial)
      tube.position.copy(from).add(to).multiplyScalar(0.5)
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
      tree.nodes[placed.face].mesh.add(tube)
    })

    // 가려진 모서리 점선: 같은 모서리 선을 한 번 더, 면 뒤에 있는 부분(GreaterDepth)만 그린다.
    // 면을 다 그린 뒤에 그려야 깊이가 차 있으므로 renderOrder 를 1 로 (docs/specs/viewer.md "가려진 모서리").
    // 실선·점선 모두 도형 크기의 2% 만큼 카메라 쪽으로 당겨서, 보이는 모서리는 확실히 면 앞, 가려진 모서리는 그대로 면 뒤가 되게 한다
    pull.value = radius * 0.02
    const hiddenMaterial = pullTowardCamera(
      new THREE.LineDashedMaterial({
        color: '#9aa0a8',
        dashSize: radius * 0.03,
        gapSize: radius * 0.03,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
      }),
      pull,
    )
    // LineLoop 은 닫는 모서리의 점선 간격이 달라져서, 모서리마다 따로 재는 LineSegments 로 그린다
    const hiddenEdges = tree.nodes.map((n) => {
      const points = poly.faces[n.face].vertices.map((i) => new THREE.Vector3(...poly.positions[i]))
      const pairs = points.flatMap((p, k) => [p, points[(k + 1) % points.length]])
      const dashed = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs), hiddenMaterial).computeLineDistances()
      dashed.renderOrder = 1
      n.mesh.add(dashed)
      // 실선도 면을 다 그린 뒤에. 실선은 깊이를 안 써서, 먼저 그리면 나중에 그린 이웃 면에 덮여 끊겨 보인다 (펼친 전개도의 접는 선)
      n.mesh.children[0].renderOrder = 1
      return dashed
    })

    // 맞닿는 모서리: 쌍마다 한 색의 가는 원기둥을 두 면 메시에 하나씩 붙인다. 접힐 때 따라오고, 다 접으면 한 자리에 겹친다.
    // 실선·점선(renderOrder 1)보다 나중에 그려서(renderOrder 2) 그 자리의 실선을 덮는다. 실선은 깊이를 안 써서 덮인다.
    // 면 뒤로 가려지면 원기둥은 안 보이고 점선만 남는다
    // 누르기 쉽게 보이지 않는 굵은 원기둥(hit)을 자식으로 둔다 (Raycaster 는 visible 과 상관없이 맞힌다)
    const pairMaterials = PAIR_COLORS.map((color) => new THREE.MeshBasicMaterial({ color }))
    const edgeGeometry = new THREE.CylinderGeometry(radius * 0.008, radius * 0.008, 1, 8) // 길이 1, 모서리마다 scale.y 로 늘린다
    const hitGeometry = new THREE.CylinderGeometry(radius * 0.04, radius * 0.04, 1, 6)
    const pairEdges = matchingEdges(poly).map((pair, k) =>
      pair.map(([face, edge]) => {
        const [a, b] = edge.map((i) => new THREE.Vector3(...poly.positions[i]))
        const mesh = new THREE.Mesh(edgeGeometry, pairMaterials[k % pairMaterials.length])
        mesh.position.addVectors(a, b).multiplyScalar(0.5)
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
        mesh.scale.y = a.distanceTo(b)
        mesh.renderOrder = 2
        const hit = new THREE.Mesh(hitGeometry)
        hit.visible = false
        hit.userData.pair = k
        mesh.add(hit)
        tree.nodes[face].mesh.add(mesh)
        return mesh
      }),
    )
    let picked: number | null = null // 누른 쌍. 뷰어 안 상태 (viewer.md "맞닿는 모서리")

    // 펼침 값 적용 + 강조 + 보기 옵션. 단계 사이에 멈춰 있을 때는 마지막에 움직인 면을 계속 강조하고, 끝(0·1)에서는 끈다
    let active: number | null = null
    const apply = () => {
      const { unfold, foldMode, showHiddenEdges, showMatchingEdges } = viewRef.current
      for (const line of hiddenEdges) line.visible = showHiddenEdges
      if (!showMatchingEdges) picked = null
      pairEdges.forEach((pair, k) =>
        pair.forEach((mesh) => {
          mesh.visible = showMatchingEdges
          mesh.scale.x = mesh.scale.z = k === picked ? 2.5 : 1 // 고른 쌍은 함께 굵게 (색만으로 구분하지 않기)
        }),
      )
      if (foldMode === 'step') {
        const values = stepUnfold(order, poly.faces.length, unfold)
        applyUnfold(tree, values)
        const moving = order.find((f) => values[f] > MOVING && values[f] < 1 - MOVING)
        if (moving !== undefined) active = moving
        else if (unfold < MOVING || unfold > 1 - MOVING) active = null
      } else {
        applyUnfold(tree, unfold)
        active = null
      }
      for (const n of tree.nodes) {
        const { faces, edge } = active === null ? looks.normal : n.face === active ? looks.active : looks.faded
        n.mesh.material = faces
        ;(n.mesh.children[0] as THREE.LineLoop).material = edge
      }
      for (const [face, bar] of bars) bar.visible = face === active
    }
    apply()
    applyRef.current = apply

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

    // 모서리 누르기: 끌어서 돌린 것은 클릭이 아니다. 같은 쌍을 다시 누르거나 빈 곳을 누르면 풀린다.
    // 면도 같이 맞혀서, 면에 가려진 뒤쪽 모서리는 고르지 않는다
    const targets = [...tree.nodes.map((n) => n.mesh), ...pairEdges.flat().map((m) => m.children[0])]
    const raycaster = new THREE.Raycaster()
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || !viewRef.current.showMatchingEdges) return
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      const hits = raycaster.intersectObjects(targets, false)
      const k: number | null = hits[0]?.object.userData.pair ?? null
      picked = k === picked ? null : k
      apply()
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(world, camera)
    })

    return () => {
      applyRef.current = null
      renderer.setAnimationLoop(null)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      disposeFaceTree(tree)
      const lookMaterials = Object.values(looks).flatMap((l) => [...l.faces, l.edge])
      for (const m of [...lookMaterials, ...pairMaterials, barMaterial, hiddenMaterial, lineMaterial, shadowFloor.material, grid.material]) m.dispose()
      edgeGeometry.dispose()
      hitGeometry.dispose()
      shadowFloor.geometry.dispose()
      grid.geometry.dispose()
      light.shadow.map?.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [scene])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
