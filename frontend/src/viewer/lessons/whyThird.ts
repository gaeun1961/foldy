// 뿔의 부피가 왜 ⅓인지 (ui.md 공식 시각화 규칙, viewer.md "설명 모드"): 물 붓기 세 번 뒤에 한 단계를 더한다. 숫자는 volumeLayout.ts
// 원뿔: 같은 두께의 원판으로 쌓은 계단. 원판이 많아질수록 원뿔에 가까워진다 (setLayers, 멈춘 뒤 슬라이더). 그다음 판을 옆으로 밀어 꼭대기를 옮긴다: 판의 크기와 개수가 그대로라 부피가 같다.
// 원기둥은 똑같은 원뿔 3개로 나뉘지 않아서 각뿔처럼 합치지는 않는다
// 각뿔: ① 꼭대기를 밑면 꼭짓점 바로 위로 옮긴다 (밑면·높이가 같아 부피가 그대로) ② 그런 사각뿔 3개가 반투명으로 하나씩 들어와 정육면체를 채운다
import * as THREE from 'three'
import { clamp01, textSprite, v3 } from './draw.ts'
import { LENGTH_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'
import { withEndLines } from './lengthLines.ts'
import { cubePyramids, STAIR_LAYERS } from './volumeLayout.ts'

const INK = '#2f2a25'
const STAIR = ['#ded6c6', '#e9e2d3'] // 층이 구분되게 번갈아
const PIECES = ['#e0442e', '#2f6fd0', '#2e9e4f']

// 물 붓기 뒤에 단계를 더한다: 앞 3단계는 물 붓기, 그 뒤는 extra 만 보인다
function afterPour(pour: LessonObject, extra: THREE.Group, show: (at: number) => void, bounds: THREE.Box3, dispose: () => void, extraSteps = 1): LessonObject {
  const group = new THREE.Group()
  group.add(pour.group, extra)
  const apply = (progress: number) => {
    const at = progress * (3 + extraSteps)
    pour.group.visible = at <= 3 + 1e-6
    extra.visible = !pour.group.visible
    pour.apply(clamp01(at / 3))
    show(Math.max(0, at - 3)) // 물 붓기 뒤 몇 단계째 (0 ~ extraSteps)
  }
  apply(0)
  return {
    ...pour,
    group,
    bounds: pour.bounds!.clone().union(bounds),
    apply,
    dispose() {
      pour.dispose()
      dispose()
      group.removeFromParent()
    },
  }
}

// 원뿔: 맨 아래 원판 반지름이 r, 위로 갈수록 r/n 씩 작아진다. 틀은 원뿔과 같은 밑면·높이의 원기둥
export function withStairStep(pour: LessonObject, r: number, h: number, frames: { cone: THREE.BufferGeometry; cup: THREE.BufferGeometry }): LessonObject {
  const extra = new THREE.Group()
  const middle = pour.bounds!.getCenter(new THREE.Vector3())
  extra.position.x = middle.x
  const max = STAIR_LAYERS[STAIR_LAYERS.length - 1]
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 48)
  const material = new THREE.MeshStandardMaterial({ color: '#faf6ee' })
  const discs = new THREE.InstancedMesh(geometry, material, max)
  discs.frustumCulled = false
  discs.castShadow = true
  extra.add(discs)
  const size = Math.max(2 * r, h)
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  const dashMaterial = new THREE.LineDashedMaterial({ color: INK, dashSize: size * 0.03, gapSize: size * 0.02 })
  const coneFrame = new THREE.LineSegments(frames.cone, lineMaterial)
  extra.add(coneFrame, new THREE.LineSegments(frames.cup, dashMaterial).computeLineDistances())

  let layers: number = STAIR_LAYERS[0]
  let grown = 0
  let slide = 0 // 판을 민 정도: 1 이면 꼭대기가 밑면 둘레 바로 위
  const place = () => {
    const m = new THREE.Matrix4()
    const color = new THREE.Color()
    for (let k = 0; k < layers; k++) {
      const radius = (r * (layers - k)) / layers
      m.makeScale(radius, (h / layers) * 0.98, radius).setPosition((r * slide * (k + 0.5)) / layers, ((k + 0.5) * h) / layers, 0)
      discs.setMatrixAt(k, m)
      discs.setColorAt(k, color.set(STAIR[k % 2]))
    }
    discs.instanceMatrix.needsUpdate = true
    if (discs.instanceColor) discs.instanceColor.needsUpdate = true
  }
  const show = (at: number) => {
    grown = clamp01(at)
    discs.count = Math.ceil(grown * layers)
    const next = clamp01(at - 1)
    if (next !== slide) {
      slide = next
      place()
    }
    coneFrame.visible = slide <= 0
  }
  place()
  const lesson = afterPour(pour, extra, show, new THREE.Box3(), () => {
    extra.removeFromParent()
    for (const g of [geometry, frames.cone, frames.cup]) g.dispose()
    discs.dispose()
    for (const m of [material, lineMaterial, dashMaterial]) m.dispose()
  }, 2)
  // 끝나면 틀 위에 공식의 r, h
  const x = middle.x
  const lines = [
    { from: new THREE.Vector3(x, h, 0), to: new THREE.Vector3(x + r, h, 0), color: LENGTH_COLOR.r },
    { from: new THREE.Vector3(x + r, 0, 0), to: new THREE.Vector3(x + r, h, 0), color: LENGTH_COLOR.h },
  ]
  return {
    ...withEndLines(lesson, lines, size * 0.012),
    bounds: pour.bounds,
    setLayers(n) {
      if (n === layers) return
      layers = n
      place()
      show(grown + slide)
    },
  }
}

// 각뿔: 한 변이 각뿔 높이 a 인 정육면체 틀 안에서 보인다
export function withCubeSplit(pour: LessonObject, a: number): LessonObject {
  const extra = new THREE.Group()
  const range = pour.bounds!
  const middle = range.getCenter(new THREE.Vector3())
  extra.position.set(middle.x - a * 0.6, range.min.y, -a / 2)
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(a, a, a))
  const frameMaterial = new THREE.LineDashedMaterial({ color: INK, dashSize: a * 0.05, gapSize: a * 0.03 })
  const frame = new THREE.LineSegments(frameGeometry, frameMaterial).computeLineDistances()
  frame.position.set(a / 2, a / 2, a / 2)
  extra.add(frame)
  const owned: { dispose(): void }[] = [lineMaterial, frameGeometry, frameMaterial]
  const sprites: ReturnType<typeof textSprite>[] = []
  const pieces = cubePyramids(a).map(({ apex, base, dir }, k) => {
    const corners = base.map(v3)
    const faces = new THREE.BufferGeometry()
    const edges = new THREE.BufferGeometry()
    // 꼭대기가 움직여도 면과 선이 따라오게 다시 만든다
    const shape = (o: THREE.Vector3) => {
      const [p, q, r, s] = corners
      faces.setFromPoints([p, q, r, p, r, s, o, p, q, o, q, r, o, r, s, o, s, p])
      faces.computeVertexNormals()
      edges.setFromPoints([p, q, q, r, r, s, s, p, o, p, o, q, o, r, o, s])
    }
    shape(v3(apex))
    const material = new THREE.MeshStandardMaterial({ color: PIECES[k], side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false }) // 안쪽이 맞물리는 것이 보이게
    owned.push(faces, edges, material)
    const mesh = new THREE.Mesh(faces, material)
    mesh.add(new THREE.LineSegments(edges, lineMaterial))
    const label = textSprite('⅓', a * 0.3)
    label.sprite.position.copy(corners[0]).add(corners[2]).multiplyScalar(0.5)
    mesh.add(label.sprite)
    sprites.push(label)
    extra.add(mesh)
    return { mesh, dir: v3(dir), shape, label: label.sprite }
  })
  const apexMid = new THREE.Vector3(a / 2, a, a / 2)
  const apexCorner = v3(cubePyramids(a)[0].apex)
  const show = (at: number) => {
    const [move, merge] = [clamp01(at), clamp01(at - 1)]
    pieces[0].shape(apexMid.clone().lerp(apexCorner, move))
    frame.visible = move > 0
    pieces.forEach(({ mesh, dir, label }, k) => {
      if (k > 0) {
        const t = clamp01(merge / 0.45 - (k - 1))
        mesh.visible = t > 0
        mesh.position.copy(dir).multiplyScalar(a * 0.8 * (1 - t)) // 하나씩 들어온다
      }
      label.visible = merge >= 1
    })
  }
  const bounds = new THREE.Box3(new THREE.Vector3(-a * 0.6 + middle.x, range.min.y, -a / 2), new THREE.Vector3(middle.x + a * 1.3, range.min.y + a, a * 1.4))
  const lesson = afterPour(
    pour,
    extra,
    show,
    bounds,
    () => {
      sprites.forEach((s) => s.dispose())
      extra.removeFromParent()
      owned.forEach((x) => x.dispose())
    },
    2,
  )
  // 끝나면 세로 모서리에 공식의 h (정육면체 한 변을 각뿔 높이로 잡았다)
  const [x0, y0] = [middle.x + a * 0.4, range.min.y]
  return withEndLines(lesson, [{ from: new THREE.Vector3(x0, y0, a / 2), to: new THREE.Vector3(x0, y0 + a, a / 2), color: LENGTH_COLOR.h }], a * 0.02)
}
