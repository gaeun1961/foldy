import * as THREE from 'three'
import { pathLength, penSweep, pointAt, type Point } from './penSweep.ts'

// 펜으로 그려 내기 (viewer.md 책 장면 "펜으로 그려 내기"). 사진에서 읽은 전개도가 책에 옮겨 그려지는 것을 보인다.
// 1) 오른쪽 쪽: 전개도(면·모서리·선·표시)는 펜이 지나간 자리만 보인다. 재질 셰이더가 바닥 좌표 x·z 로 가림 그림(mask)을 읽어 버린다
// 2) 펜이 왼쪽 쪽으로 건너간다 3) 왼쪽 쪽: 빈 쪽 그림 위에 펜이 지나간 자리만 글이 있는 쪽 그림 4) 펜이 들려 사라진다
// 가림 그림은 펜 길(penSweep)을 굵은 흰 선으로 칠한다. 펜 조금 뒤까지는 빈틈없이, 펜 바로 뒤 끝자락만 색연필 결(흰 빗금 무늬)로 군데군데 빈다

const MS = { net: 700, cross: 250, text: 700, lift: 250 }
const TRAIL = 0.12 // 끝자락 길이 (길 전체에 대한 비율)
const smooth = (t: number) => t * t * (3 - 2 * t)

// 색연필 결: 투명 바탕에 / 방향 짧은 흰 빗금을 촘촘히. 가림 그림의 끝자락을 이 무늬로 칠하면 군데군데 빈다
let grainCanvas: HTMLCanvasElement | null = null
function grain() {
  if (grainCanvas) return grainCanvas
  const c = document.createElement('canvas')
  c.width = c.height = 96
  const ctx = c.getContext('2d')!
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'
  const [dx, dy] = [Math.cos((50 * Math.PI) / 180), -Math.sin((50 * Math.PI) / 180)] // 캔버스는 y 가 아래라 / 방향
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646 // 늘 같은 결
  for (let k = 0; k < 420; k++) {
    const [x, y, len] = [rand() * 96, rand() * 96, 5 + rand() * 14]
    ctx.lineWidth = 1 + rand() * 2.2
    for (const [ox, oy] of [[0, 0], [96, 0], [-96, 0], [0, 96], [0, -96]]) {
      ctx.beginPath()
      ctx.moveTo(x + ox, y + oy)
      ctx.lineTo(x + ox + dx * len, y + oy + dy * len)
      ctx.stroke()
    }
  }
  return (grainCanvas = c)
}

// 가림 그림: 검은 바탕(가림)에 펜이 지나간 길을 흰색(보임)으로. 캔버스 (0, 0) 이 왼쪽 위
class SweepMask {
  readonly canvas = document.createElement('canvas')
  readonly texture: THREE.CanvasTexture
  readonly points: Point[]
  readonly length: number
  private readonly ctx: CanvasRenderingContext2D
  private readonly width: number
  private readonly pattern: CanvasPattern
  constructor(w: number, h: number, area: { x: number; y: number; w: number; h: number }, passes: number) {
    this.canvas.width = Math.round(w)
    this.canvas.height = Math.round(h)
    this.ctx = this.canvas.getContext('2d')!
    const sweep = penSweep(area.x, area.y, area.w, area.h, passes)
    this.points = sweep.points
    this.width = sweep.width
    this.length = pathLength(this.points)
    this.pattern = this.ctx.createPattern(grain(), 'repeat')!
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.NoColorSpace
    this.paint(0, area)
  }
  // at: 펜이 간 길이. 칠할 곳 밖(area 밖)은 처음부터 보이게 둘 수 있다
  paint(at: number, open?: { x: number; y: number; w: number; h: number }) {
    const { ctx, canvas } = this
    ctx.setLineDash([])
    if (open) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#000'
      ctx.fillRect(open.x, open.y, open.w, open.h)
    }
    const filled = at >= this.length ? this.length : Math.max(0, at - this.length * TRAIL)
    ctx.lineWidth = this.width
    ctx.lineCap = ctx.lineJoin = 'round'
    const stroke = (style: string | CanvasPattern, from: number, to: number) => {
      if (to - from <= 0) return
      ctx.strokeStyle = style
      ctx.setLineDash([to - from, this.length * 2 + 1])
      ctx.lineDashOffset = -from
      ctx.beginPath()
      this.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
    }
    stroke('#fff', 0, filled)
    stroke(this.pattern, filled, Math.min(at, this.length))
    this.texture.needsUpdate = true
  }
}

// 바닥(전개도) 재질: 판 좌표(frame 의 x·z)가 가림 그림에서 검은 곳이면 버린다. 다른 onBeforeCompile(pullTowardCamera 등)과 겹쳐 쓴다.
// 판은 보통 월드 그대로(책 위 바닥)이고, 띄우거나 기울인 판이면 그 판의 좌표계다
type FloorReveal = { map: { value: THREE.Texture }; box: { value: THREE.Vector4 }; frame: { value: THREE.Matrix4 }; on: { value: number } }
function hideUntilDrawn(material: THREE.Material, reveal: FloorReveal) {
  const before = material.onBeforeCompile.bind(material)
  const key = material.customProgramCacheKey.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer)
    shader.uniforms.revealMap = reveal.map
    shader.uniforms.revealBox = reveal.box
    shader.uniforms.revealOn = reveal.on
    shader.vertexShader = 'varying vec3 vRevealPos;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvRevealPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader =
      'uniform sampler2D revealMap;\nuniform vec4 revealBox;\nuniform float revealOn;\nvarying vec3 vRevealPos;\n' +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif (revealOn > 0.5) { vec2 ru = (vRevealPos.xz - revealBox.xy) / revealBox.zw; if (texture2D(revealMap, vec2(ru.x, 1.0 - ru.y)).r < 0.5) discard; }',
      )
  }
  material.customProgramCacheKey = () => key() + '|reveal'
  material.needsUpdate = true
}

// 왼쪽 쪽 재질: 가림 그림이 검은 곳은 빈 쪽 그림, 흰 곳은 글이 있는 쪽 그림
function writeUntilDrawn(material: THREE.MeshStandardMaterial, blank: THREE.Texture, mask: THREE.Texture, on: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.revealBlank = { value: blank }
    shader.uniforms.revealMask = { value: mask }
    shader.uniforms.revealOn = on
    shader.fragmentShader =
      'uniform sampler2D revealBlank;\nuniform sampler2D revealMask;\nuniform float revealOn;\n' +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\nif (revealOn > 0.5) { float m = texture2D(revealMask, vMapUv).r; diffuseColor.rgb = mix(texture2D(revealBlank, vMapUv).rgb, diffuseColor.rgb, m); }',
      )
  }
  material.customProgramCacheKey = () => 'write'
  material.needsUpdate = true
}

// 펜: 펜촉이 원점, 몸통은 +y. 몸통 청록(--accent 계열), 끝 복숭아색(--peach), 깎은 나무는 종이색, 촉은 --ink
function penModel(length: number) {
  const group = new THREE.Group()
  const r = length * 0.055
  const part = (geometry: THREE.BufferGeometry, color: string, y: number, roughness = 0.55) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness }))
    mesh.position.y = y
    mesh.castShadow = true
    group.add(mesh)
  }
  const tip = length * 0.05
  const wood = length * 0.14
  const body = length * 0.68
  const cap = length * 0.08
  part(new THREE.ConeGeometry(r * 0.38, tip, 20).rotateX(Math.PI), '#1f2430', tip / 2)
  part(new THREE.CylinderGeometry(r * 0.38, r, wood, 20), '#f1e6d2', tip + wood / 2, 0.8)
  part(new THREE.CylinderGeometry(r, r, length * 0.03, 20), '#37767f', tip + wood + length * 0.015)
  part(new THREE.CylinderGeometry(r, r, body, 20), '#4a9099', tip + wood + body / 2, 0.45)
  part(new THREE.CylinderGeometry(r, r * 0.9, cap, 20), '#eeb48f', tip + wood + body + cap / 2, 0.6)
  // 펜 위쪽이 화면 오른쪽 위로 기울게 (2D 시안과 같은 손 모양)
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.55, 0.8, -0.25).normalize())
  return group
}

export type PenDraw = { pen: THREE.Group; update: (now: number) => void; dispose: () => void }

// 그릴 판 하나: frame(판 좌표계, 없으면 월드) 안의 전개도 범위 box(x·z), 판 높이 y, 가릴 재질. 판마다 재질이 따로여야 한다(가림 그림이 판마다 다름)
// onDrawn: 그 판을 다 칠했을 때 (그림자처럼 가림 셰이더가 안 걸리는 것을 그때 켠다)
export type PenFloor = { box: THREE.Box3; y: number; frame?: THREE.Object3D; materials: THREE.Material[]; onDrawn?: () => void }

// floors 를 차례로 칠하고(여럿이면 하나씩 빠르게), 왼쪽 쪽 글을 써 낸다. page: 왼쪽 쪽 재질·빈 쪽 그림과 월드 사각형(x0, z0 가 먼 왼쪽 모서리)
export function startPenDraw(opts: {
  floors: PenFloor[]
  page: { material: THREE.MeshStandardMaterial; blank: THREE.Texture; x0: number; z0: number; w: number; d: number; y: number } | null
  size: number
  pace?: number // 시간 배수 (시연에서 천천히 보기, 기본 1)
  onDone: () => void
}): PenDraw {
  const { floors, page, size, onDone, pace = 1 } = opts
  const many = floors.length > 1
  const netMs = many ? 450 : MS.net // 여럿이면 하나씩 짧게 (모두 합쳐 길어지지 않게)
  const crossMs = many ? 180 : MS.cross
  const sheets = floors.map((floor) => {
    const fw = floor.box.max.x - floor.box.min.x
    const fd = floor.box.max.z - floor.box.min.z
    const scale = 512 / Math.max(fw, fd)
    const mask = new SweepMask(fw * scale, fd * scale, { x: 0, y: 0, w: fw * scale, h: fd * scale }, 9)
    const on = { value: 1 }
    const frame = { value: new THREE.Matrix4() }
    const reveal: FloorReveal = { map: { value: mask.texture }, box: { value: new THREE.Vector4(floor.box.min.x, floor.box.min.z, fw, fd) }, frame, on }
    for (const m of floor.materials) hideUntilDrawn(m, reveal)
    const at = (p: Point) => {
      const v = new THREE.Vector3(floor.box.min.x + p.x / scale, floor.y, floor.box.min.z + p.y / scale)
      return floor.frame ? floor.frame.localToWorld(v) : v
    }
    const syncFrame = () => {
      if (floor.frame) frame.value.copy(floor.frame.matrixWorld).invert()
    }
    return { mask, on, at, syncFrame, onDrawn: floor.onDrawn, start: at(mask.points[0]), end: at(mask.points[mask.points.length - 1]) }
  })

  // 왼쪽 쪽: 가장자리 여백을 뺀 곳을 칠한다 (그 밖은 처음부터 보임)
  const pageOn = { value: 1 }
  const pageMask = page
    ? (() => {
        const [w, h] = [512, Math.round((512 * page.d) / page.w)]
        const area = { x: w * 0.08, y: h * 0.06, w: w * 0.84, h: h * 0.88 }
        const mask = new SweepMask(w, h, area, 10)
        mask.paint(0, area)
        writeUntilDrawn(page.material, page.blank, mask.texture, pageOn)
        return { mask, area, w, h }
      })()
    : null
  const pageAt = (p: Point) => new THREE.Vector3(page!.x0 + (p.x / pageMask!.w) * page!.w, page!.y, page!.z0 + (p.y / pageMask!.h) * page!.d)

  // 단계: 판마다 [건너가기(첫 판은 없음), 칠하기], 그다음 왼쪽 쪽으로 건너가 쓰기, 들어 올리기
  type Step = { ms: number; run: (k: number) => void }
  const lift = (from: () => THREE.Vector3, to: () => THREE.Vector3) => (k: number) => {
    const e = smooth(k)
    pen.position.lerpVectors(from(), to(), e)
    pen.position.y += Math.sin(Math.PI * e) * size * 0.35 // 들어서 건너간다
  }
  const steps: Step[] = []
  sheets.forEach((sheet, i) => {
    if (i) steps.push({ ms: crossMs, run: lift(() => sheets[i - 1].end, () => sheet.start) })
    steps.push({
      ms: netMs,
      run: (k) => {
        const at = sheet.mask.length * smooth(k)
        sheet.mask.paint(at)
        pen.position.copy(sheet.at(pointAt(sheet.mask.points, at)))
        if (k >= 1) {
          sheet.on.value = 0 // 다 그렸으니 가림을 끈다
          sheet.onDrawn?.()
        }
      },
    })
  })
  if (pageMask) {
    const last = sheets[sheets.length - 1]
    steps.push({ ms: MS.cross, run: lift(() => last?.end ?? pageAt(pageMask.mask.points[0]), () => pageAt(pageMask.mask.points[0])) })
    steps.push({
      ms: MS.text,
      run: (k) => {
        const at = pageMask.mask.length * smooth(k)
        pageMask.mask.paint(at, pageMask.area)
        pen.position.copy(pageAt(pointAt(pageMask.mask.points, at)))
        if (k >= 1) pageOn.value = 0
      },
    })
  }
  let liftFrom: THREE.Vector3 | null = null
  steps.push({
    ms: MS.lift,
    run: (k) => {
      liftFrom ??= pen.position.clone()
      pen.position.copy(liftFrom).setY(liftFrom.y + smooth(k) * size * 1.5)
    },
  })

  const pen = penModel(size)
  pen.position.copy(sheets[0]?.start ?? new THREE.Vector3())
  let start: number | null = null // 지금 단계를 시작한 때
  let step = 0
  let done = false
  const finish = (tell = true) => {
    if (done) return
    done = true
    for (const s of sheets) {
      if (s.on.value) s.onDrawn?.()
      s.on.value = 0
    }
    pageOn.value = 0
    pen.visible = false
    if (tell) onDone()
  }
  const update = (now: number) => {
    if (done) return
    for (const s of sheets) s.syncFrame()
    start ??= now
    // 프레임이 띄엄띄엄 와도 지난 단계는 끝까지 한 번 마치고 넘어간다
    while (step < steps.length && now - start >= steps[step].ms * pace) {
      steps[step].run(1)
      start += steps[step].ms * pace
      step++
    }
    if (step < steps.length) steps[step].run((now - start) / (steps[step].ms * pace))
    else finish()
  }
  return {
    pen,
    update,
    dispose: () => {
      finish(false)
      for (const s of sheets) s.mask.texture.dispose()
      pageMask?.mask.texture.dispose()
      pen.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
    },
  }
}

// 읽는 중 (viewer.md "빈 책" 읽는 중): 사진 위(rect, 월드 x·z, 높이 y)를 펜이 반투명 칠로 계속 칠한다.
// 얼마나 걸릴지 몰라서 다 칠하면 칠을 지우고 처음부터 되풀이한다. 칠은 가림 그림을 alphaMap 으로 쓰는 판 하나
const SKETCH_MS = 3500
export function startPenSketch(rect: { x: number; z: number; w: number; d: number; y: number }, size: number) {
  const scale = 512 / Math.max(rect.w, rect.d)
  const area = { x: 0, y: 0, w: rect.w * scale, h: rect.d * scale }
  const mask = new SweepMask(area.w, area.h, area, 9)
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(rect.w, rect.d),
    new THREE.MeshBasicMaterial({ color: '#9fd3dc', alphaMap: mask.texture, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  )
  paint.rotation.x = -Math.PI / 2 // 판 위쪽(캔버스 위) = 먼 쪽(−z)
  paint.position.set(rect.x + rect.w / 2, rect.y, rect.z + rect.d / 2)
  const pen = penModel(size)
  const at = (p: Point) => new THREE.Vector3(rect.x + p.x / scale, rect.y, rect.z + p.y / scale)
  pen.position.copy(at(mask.points[0]))
  const group = new THREE.Group()
  group.add(paint, pen)
  let start: number | null = null
  let round = -1
  return {
    group,
    update: (now: number) => {
      start ??= now
      const t = (now - start) / SKETCH_MS
      if (Math.floor(t) !== round) {
        round = Math.floor(t)
        mask.paint(0, area) // 한 바퀴 끝: 칠을 지우고 처음부터
      }
      const d = mask.length * smooth(t - round)
      mask.paint(d)
      pen.position.copy(at(pointAt(mask.points, d)))
    },
    dispose: () => {
      mask.texture.dispose()
      paint.geometry.dispose()
      ;(paint.material as THREE.Material).dispose()
      pen.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
    },
  }
}
