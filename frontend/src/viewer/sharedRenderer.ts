import * as THREE from 'three'

// 공용 렌더러 (docs/specs/viewer.md "공용 렌더러", three.js 예제 webgl_multiple_elements 방식).
// 캔버스는 화면 전체에 고정해 두고, 등록된 뷰마다 컨테이너의 화면 위치를 재서 그 영역(viewport·scissor)에만 그린다.
// 뷰어가 몇 개든 WebGL 컨텍스트는 하나다. 첫 뷰가 등록될 때 만들고, 마지막 뷰가 빠지면 없앤다.

export interface View {
  container: HTMLElement // 이 영역에 그린다. 캔버스는 입력을 받지 않으므로 OrbitControls 는 여기에 붙인다
  scene: THREE.Scene
  camera: THREE.Camera
  beforeRender?: () => void // controls.update() 등 프레임마다 할 일
}

let renderer: THREE.WebGLRenderer | null = null
const views = new Set<View>()

function create() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  r.setPixelRatio(window.devicePixelRatio)
  r.setClearColor(0x000000, 0) // 뷰 밖은 투명. 페이지 배경이 그대로 보인다
  r.shadowMap.enabled = true // 기본 PCF. 가장자리는 light.shadow.radius 로 흐리게
  r.setScissorTest(true)
  // 페이지 맨 뒤(z-index -1): body 배경보다는 앞, 패널·배지 등 모든 내용보다는 뒤. 뷰어 컨테이너는 배경이 없어서 그 자리만 비친다
  Object.assign(r.domElement.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '-1' })
  document.body.appendChild(r.domElement)
  r.setAnimationLoop(frame)
  return r
}

function frame() {
  const r = renderer!
  const canvas = r.domElement
  // 창 크기가 바뀌었을 때만 버퍼 크기를 맞춘다. CSS 크기(100%)는 건드리지 않는다
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.floor(w * r.getPixelRatio()) || canvas.height !== Math.floor(h * r.getPixelRatio())) r.setSize(w, h, false)

  r.setScissorTest(false)
  r.clear()
  r.setScissorTest(true)
  for (const view of views) {
    const rect = view.container.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > h || rect.right < 0 || rect.left > w || rect.width === 0 || rect.height === 0) continue // 화면 밖
    const bottom = h - rect.bottom // WebGL 은 아래가 0
    r.setViewport(rect.left, bottom, rect.width, rect.height)
    r.setScissor(rect.left, bottom, rect.width, rect.height)
    view.beforeRender?.()
    r.render(view.scene, view.camera) // scene.background 가 있으면 이 영역만 그 색으로 지우고 그린다
  }
}

// 뷰를 등록한다. 돌려주는 함수로 해제한다
export function addView(view: View) {
  renderer ??= create()
  views.add(view)
  return () => {
    views.delete(view)
    if (views.size === 0 && renderer) {
      renderer.setAnimationLoop(null)
      renderer.dispose()
      renderer.domElement.remove()
      renderer = null
    }
  }
}
