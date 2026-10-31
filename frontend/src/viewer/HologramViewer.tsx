// 아크릴 피라미드 홀로그램 화면 (docs/specs/viewer.md "홀로그램").
// 무대(stage.ts)가 만든 도형 하나를 앞·오른쪽·뒤·왼쪽 카메라 4대로 그려 각자의 텍스처에 담고,
// 화면 가운데 둘레의 사다리꼴 4칸에 붙인다. 홀로그램은 도형 종류를 모른다: 무대가 주는 물체·범위·접기만 쓴다.
// 색은 3D 디자인 토큰 HOLOGRAM (theme.ts), 배치 계산은 holoLayout.ts. 도형은 늘 천천히 돌며 접었다 편다
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { ShapeScene } from '../shared/types.ts'
import type { NetPhoto } from './index.ts'
import { fitDistance, regions, uvOf, type Region } from './holoLayout.ts'
import { buildStage } from './stage.ts'
import { HOLOGRAM } from './theme.ts'

export interface HologramProps {
  scene: ShapeScene // 무대가 그릴 수 있는 도형 (hologramSupported). 바뀌면 다시 만든다
  center?: number // 가운데 정사각형 한 변 / 화면 짧은 변 = 피라미드 꼭지 크기 (기본 0.2). 기기마다 다른 유일한 값
  showGuide?: boolean // 가운데 정사각형 테두리 = 피라미드 놓을 자리 (기본 false). 가운데를 맞출 때만 켠다
  onTap?: () => void // 화면을 누르면 (설정 열기)
  photo?: NetPhoto // 면에 입힐 학습지 사진 (grid 전개도일 때만, 이슈 #130). 바뀌면 다시 만든다
}

const FOV = 35
const ELEVATION = 20 // 카메라 높이각 (도). 펼칠수록 45°까지 올라간다
const SPIN = 0.35 // 세로축으로 도는 빠르기 (rad/s)
// 반복: 펼친 채 → 접기 (단계가 있으면 한 면씩) → 접힌 채 → 한 번에 펼치기 (초)
const HOLD_OPEN = 1.5
const STEP = 0.9 // 면 하나 접는 시간
const FOLD_ALL = 3 // 단계가 없는 도형(원기둥·원뿔)을 한 번에 접는 시간
const HOLD_CLOSED = 4
const OPEN = 1.5
const smooth = (t: number) => t * t * (3 - 2 * t)
const pixelRatio = () => Math.min(window.devicePixelRatio, 2) // 휴대폰은 4번 그리므로 2배까지만

// 세로축으로 돌아도 들어가는 반지름: 수평은 축(원점)에서 가장 먼 곳, 세로는 높이의 절반
function spinRadius(box: THREE.Box3) {
  const far = Math.max(...[box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => Math.hypot(x, z))))
  return Math.hypot(far, (box.max.y - box.min.y) / 2)
}

export function HologramViewer({ scene, center = 0.2, showGuide = false, onTap, photo }: HologramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // 가운데·놓을 자리는 다시 만들지 않고 칸만 다시 배치한다
  const options = useRef({ center, showGuide })
  const relayout = useRef<(() => void) | null>(null)
  // 사진 위치는 부모가 그릴 때마다 새 객체라서 값(문자열)으로 비교하고, 만들 때 문자열에서 꺼낸다
  const photoKey = photo ? JSON.stringify(photo) : ''

  useEffect(() => {
    const before = options.current
    options.current = { center, showGuide }
    if (before.center !== center || before.showGuide !== showGuide) relayout.current?.()
  }, [center, showGuide])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    const screen = HOLOGRAM.screen ?? { background: '#000000', guide: '#ffffff' }
    renderer.setClearColor(screen.background, 1)
    container.appendChild(renderer.domElement)

    const world = new THREE.Scene()
    const spinner = new THREE.Group() // 세로축으로 돈다. 무대의 원점이 곧 돌리는 축
    world.add(spinner)
    const cameras = [0, 1, 2, 3].map(() => new THREE.PerspectiveCamera(FOV, 1, 0.01, 1000))

    const stage = buildStage(scene, HOLOGRAM, { photo: photoKey ? (JSON.parse(photoKey) as NetPhoto) : undefined })
    if (stage) spinner.add(stage.object)
    const solidY = stage ? stage.solid.getCenter(new THREE.Vector3()).y : 0 // 다 접은 입체의 가운데 높이
    const target = new THREE.Vector3()
    const rSolid = stage ? spinRadius(stage.solid) : 1
    const rAll = stage ? spinRadius(stage.all) : 1

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
      // 칸마다 사다리꼴 메시에 그 칸 카메라의 그림을 붙인다
      targets = regionList.map((region) => {
        const target = new THREE.WebGLRenderTarget(tw, th, { samples: 4 })
        const [a, b, cc, d] = region.corners
        const tri = [a, b, cc, a, cc, d]
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap((p) => [p[0], p[1], 0]), 3))
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(tri.flatMap((p) => uvOf(region, L, c, p)), 2))
        composite.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: target.texture, side: THREE.DoubleSide })))
        return target
      })
      for (const camera of cameras) {
        camera.aspect = tw / th
        camera.updateProjectionMatrix()
      }
      stage?.resize(tw, th)

      if (o.showGuide) {
        composite.add(
          new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(regionList.map((r) => new THREE.Vector3(r.corners[0][0], r.corners[0][1], 0))),
            new THREE.LineBasicMaterial({ color: screen.guide }),
          ),
        )
      }
    }
    relayout.current = layout

    const cycleStart = performance.now()
    // 지금 펼침 값과 접는 방식
    const unfoldAt = (now: number): { s: number; mode: 'all' | 'step' } => {
      if (!stage || !stage.foldable) return { s: 0, mode: 'all' }
      const stepped = stage.steps > 0
      const folding = stepped ? STEP * stage.steps : FOLD_ALL
      const t = ((now - cycleStart) / 1000) % (HOLD_OPEN + folding + HOLD_CLOSED + OPEN)
      if (t < HOLD_OPEN) return { s: 1, mode: 'all' }
      if (t < HOLD_OPEN + folding) {
        const f = (t - HOLD_OPEN) / folding
        return stepped ? { s: 1 - f, mode: 'step' } : { s: 1 - smooth(f), mode: 'all' }
      }
      if (t < HOLD_OPEN + folding + HOLD_CLOSED) return { s: 0, mode: 'all' }
      return { s: smooth((t - HOLD_OPEN - folding - HOLD_CLOSED) / OPEN), mode: 'all' }
    }

    let open = 0 // 펼친 정도를 부드럽게 따라가는 값 (카메라 거리·높이)
    let last = performance.now()
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (stage) {
        const { s, mode } = unfoldAt(now)
        stage.apply(s, mode)
        spinner.rotation.y += dt * SPIN
        // 다 접히면 입체 쪽으로 당겨 크게 보고, 펼칠수록 물러나며 위에서 내려다본다 (바닥에 누운 전개도가 납작하지 않게)
        open += (Math.min(1, s * 1.5) - open) * Math.min(1, dt * 3)
        const distance = fitDistance(L, c, THREE.MathUtils.lerp(rSolid, rAll, open), FOV)
        const el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(ELEVATION, 45, open))
        // 펼칠수록 바닥(전개도가 눕는 곳)을 본다. 그래야 넓은 전개도가 칸의 넓은 가운데에 오고 좁은 안쪽 변에서 잘리지 않는다
        target.set(0, THREE.MathUtils.lerp(solidY, 0, open), 0)
        regionList.forEach((region, k) => {
          const camera = cameras[k]
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
      stage?.dispose()
      clearComposite()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [scene, photoKey])

  return <div ref={containerRef} className="hologram-viewer" onClick={onTap} />
}
