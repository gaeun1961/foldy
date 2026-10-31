// 뿔의 부피 실험 (docs/specs/viewer.md "설명 모드"): 원뿔·각뿔에 물을 담아 같은 밑면·높이의 통에 세 번 붓는다.
// 초5~중1 수업의 실험과 같다. 왜 하필 3번인지 증명하지 않고, 눈으로 세어 본다.
// 한 번 붓기: 들어 올림 → 기울임 → 물줄기가 떨어지며 통이 찬다 → 내려놓음. 단계 사이에 멈추면 뿔은 다시 물이 찬 모습
import * as THREE from 'three'
import { clamp01, DONE, textSprite } from './draw.ts'
import type { LessonObject } from './index.ts'

const WATER = '#2f6fd0'
const INK = '#2f2a25'
const LIFT = 1.15 // 통 위로 들어 올리는 높이 (높이 h 의 배수)

// progress(0~1) → 지금 모습. three.js 없음 (npm test 로 검사)
// pours 번 부어서 한 번에 share 만큼 찬다 (뿔: 세 번에 ⅓씩, 구: 한 번에 ⅔)
export function pourState(progress: number, pours = 3, share = 1 / 3) {
  if (progress >= DONE) return { pour: pours - 1, lift: 0, tilt: 0, flow: 0, level: pours * share, inside: 0 }
  const t = clamp01(progress) * pours
  const pour = Math.min(Math.floor(t + 1e-6), pours - 1) // 몇 번째 붓기 (0부터). 소수 오차로 1/3 × 3 이 1 보다 작게 나와도 다음 번으로
  const q = Math.max(0, t - pour)
  const lift = q < 0.25 ? q / 0.25 : q > 0.8 ? (1 - q) / 0.2 : 1
  const tilt = q > 0.8 ? 0 : clamp01((q - 0.25) / 0.1)
  const flow = clamp01((q - 0.35) / 0.45)
  return { pour, lift, tilt, flow, level: (pour + flow) * share, inside: 1 - flow }
}

interface PourOptions {
  body: THREE.BufferGeometry // 뿔. 좌표는 처음 자리 그대로, 밑면 높이가 baseY
  bodyEdges: THREE.BufferGeometry
  baseY: number
  cupFill: THREE.BufferGeometry // 통 안의 물. 가운데가 원점, 높이 fillHeight
  fillHeight: number
  cupEdges: THREE.BufferGeometry
  cupEdgesY: number // 통 틀을 놓을 높이
  rim: THREE.Vector3[] // 밑면 둘레 (y = 0). 눈금으로 쓴다
  cupX: number // 통 자리
  radius: number // 밑면 반지름 (통 오른쪽 글자 자리, 범위)
  height: number
  heightLabel: string
  pours?: number // 몇 번 붓는지 (기본 3)
  share?: number // 한 번에 통의 얼마가 차는지 (기본 ⅓)
  heightFromStart?: boolean // 통 높이 글자를 처음부터 보인다 (구: 통 부피부터 구한다). 아니면 다 부은 뒤에
}

export function buildPourLesson(o: PourOptions): LessonObject {
  const { baseY, cupX, radius: R, height: h } = o
  const group = new THREE.Group()
  const size = Math.max(2 * R, h)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: WATER, transparent: true })
  const waterMaterial = new THREE.MeshStandardMaterial({ color: WATER })
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  const tickMaterial = new THREE.LineDashedMaterial({ color: INK, dashSize: size * 0.03, gapSize: size * 0.02 })

  // 뿔: 밑면 가운데를 축으로 움직이게 holder 에 넣는다
  const holder = new THREE.Group()
  const body = new THREE.Mesh(o.body, bodyMaterial)
  body.position.y = -baseY
  body.castShadow = true
  body.add(new THREE.LineSegments(o.bodyEdges, lineMaterial))
  holder.add(body)
  group.add(holder)

  // 통: 틀, 물, ⅓·⅔ 눈금
  const frame = new THREE.LineSegments(o.cupEdges, lineMaterial)
  frame.position.set(cupX, o.cupEdgesY, 0)
  const water = new THREE.Mesh(o.cupFill, waterMaterial)
  water.position.x = cupX
  group.add(frame, water)
  const tickGeometry = new THREE.BufferGeometry().setFromPoints([...o.rim, o.rim[0]])
  const tickLabels = ['⅓', '⅔'].map((text, k) => {
    const y = baseY + (h * (k + 1)) / 3
    const tick = new THREE.Line(tickGeometry, tickMaterial).computeLineDistances()
    tick.position.set(cupX, y, 0)
    group.add(tick)
    const s = textSprite(text, size * 0.32)
    s.sprite.position.set(cupX + R + size * 0.2, y, 0)
    group.add(s.sprite)
    return s
  })
  const sprites = [...tickLabels]
  const heightLabel = textSprite(o.heightLabel, size * 0.45, false, '#2f6fd0')
  heightLabel.sprite.position.set(cupX, baseY, R + size * 0.18)
  group.add(heightLabel.sprite)
  sprites.push(heightLabel)
  // 몇 번째 붓는지: 통 위에
  const pours = o.pours ?? 3
  const counts = [...Array(pours).keys()].map((k) => {
    const s = textSprite(`${k + 1}번`, size * 0.4)
    s.sprite.position.set(cupX + R + size * 0.2, baseY + h + size * 0.18, 0)
    group.add(s.sprite)
    sprites.push(s)
    return s.sprite
  })

  // 물줄기: 뿔 입구에서 물 위까지
  const streamGeometry = new THREE.CylinderGeometry(R * 0.1, R * 0.1, 1, 12)
  const stream = new THREE.Mesh(streamGeometry, waterMaterial)
  stream.position.x = cupX
  group.add(stream)

  const top = baseY + h * (1 + LIFT)
  const apply = (progress: number) => {
    const { pour, lift, tilt, flow, level, inside } = pourState(progress, pours, o.share)
    holder.position.set(cupX * lift, baseY + h * LIFT * lift, 0)
    holder.rotation.z = -0.35 * tilt
    bodyMaterial.opacity = 0.12 + 0.88 * inside
    water.visible = level > 0
    tickLabels.forEach((s, k) => (s.sprite.visible = level >= (k + 1) / 3 - 1e-6)) // 물이 거기까지 차면
    heightLabel.sprite.visible = !!o.heightFromStart || progress >= DONE
    water.scale.set(1, Math.max(level * h, 1e-3) / o.fillHeight, 1)
    water.position.y = baseY + (level * h) / 2
    const pouring = flow > 0 && flow < 1
    stream.visible = pouring
    if (pouring) {
      const [from, to] = [holder.position.y, baseY + level * h]
      stream.position.y = (from + to) / 2
      stream.scale.y = Math.max(from - to, 1e-3)
    }
    // 붓는 동안과 끝난 뒤 몇 번째인지 보인다. 단계 사이에 멈추면 지금까지 부은 번수
    const count = progress >= DONE ? pours - 1 : lift > 0 ? pour : pour - 1
    counts.forEach((c, k) => (c.visible = k === count))
  }
  apply(0)

  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-R, baseY, -R), new THREE.Vector3(cupX + R + size * 0.3, top, R)),
    view: new THREE.Vector3(0.3, 0.88, 1), // 수평에서 40°: 통에 물이 얼마나 찼는지 보이게
    apply,
    dispose() {
      sprites.forEach((s) => s.dispose())
      group.removeFromParent()
      for (const g of [o.body, o.bodyEdges, o.cupFill, o.cupEdges, tickGeometry, streamGeometry]) g.dispose()
      for (const m of [bodyMaterial, waterMaterial, lineMaterial, tickMaterial]) m.dispose()
    },
  }
}
