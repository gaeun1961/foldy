// 뿔의 부피가 왜 ⅓인지 (ui.md 공식 시각화 규칙, viewer.md "설명 모드"): 물 붓기 세 번 뒤에 한 단계를 더한다. 숫자는 volumeLayout.ts
// 원뿔: 같은 두께의 원판으로 쌓은 계단. 원판이 많아질수록 원뿔에 가까워진다 (setLayers, 멈춘 뒤 슬라이더)
// 각뿔: 정육면체를 한 꼭짓점에서 잘라 똑같은 사각뿔 3개로 나눈다. 하나씩 빠져나왔다가 다시 합쳐진다
import * as THREE from 'three'
import { clamp01, textSprite, v3 } from './draw.ts'
import { LENGTH_COLOR } from './formulas.ts'
import type { LessonObject } from './index.ts'
import { withEndLines } from './lengthLines.ts'
import { cubePyramids, STAIR_LAYERS } from './volumeLayout.ts'

const INK = '#3c4048'
const STAIR = ['#74c0fc', '#d0ebff'] // 층이 구분되게 번갈아
const PIECES = ['#ffb74d', '#74c0fc', '#8ce99a']

// 물 붓기 뒤에 한 단계: 앞 3단계는 물 붓기, 마지막 단계는 extra 만 보인다
function afterPour(pour: LessonObject, extra: THREE.Group, show: (q: number) => void, bounds: THREE.Box3, dispose: () => void): LessonObject {
  const group = new THREE.Group()
  group.add(pour.group, extra)
  const apply = (progress: number) => {
    const at = progress * 4
    pour.group.visible = at <= 3 + 1e-6
    extra.visible = !pour.group.visible
    pour.apply(clamp01(at / 3))
    show(clamp01(at - 3))
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
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff' })
  const discs = new THREE.InstancedMesh(geometry, material, max)
  discs.frustumCulled = false
  discs.castShadow = true
  extra.add(discs)
  const size = Math.max(2 * r, h)
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  const dashMaterial = new THREE.LineDashedMaterial({ color: INK, dashSize: size * 0.03, gapSize: size * 0.02 })
  extra.add(new THREE.LineSegments(frames.cone, lineMaterial), new THREE.LineSegments(frames.cup, dashMaterial).computeLineDistances())

  let layers: number = STAIR_LAYERS[0]
  let grown = 0
  const place = () => {
    const m = new THREE.Matrix4()
    const color = new THREE.Color()
    for (let k = 0; k < layers; k++) {
      const radius = (r * (layers - k)) / layers
      m.makeScale(radius, (h / layers) * 0.98, radius).setPosition(0, ((k + 0.5) * h) / layers, 0)
      discs.setMatrixAt(k, m)
      discs.setColorAt(k, color.set(STAIR[k % 2]))
    }
    discs.instanceMatrix.needsUpdate = true
    if (discs.instanceColor) discs.instanceColor.needsUpdate = true
  }
  const show = (q: number) => {
    grown = q
    discs.count = Math.ceil(q * layers)
  }
  place()
  const lesson = afterPour(pour, extra, show, new THREE.Box3(), () => {
    extra.removeFromParent()
    for (const g of [geometry, frames.cone, frames.cup]) g.dispose()
    discs.dispose()
    for (const m of [material, lineMaterial, dashMaterial]) m.dispose()
  })
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
      show(grown)
    },
  }
}

// 각뿔: 꼭짓점이 입체 아래쪽 구석이라 세 조각이 +x, +y, +z 로 빠져나간다 (바닥을 뚫지 않게)
export function withCubeSplit(pour: LessonObject, a: number): LessonObject {
  const extra = new THREE.Group()
  const range = pour.bounds!
  const middle = range.getCenter(new THREE.Vector3())
  extra.position.set(middle.x - a * 0.6, range.min.y, -a / 2)
  const lineMaterial = new THREE.LineBasicMaterial({ color: INK })
  const owned: { dispose(): void }[] = [lineMaterial]
  const sprites: ReturnType<typeof textSprite>[] = []
  const pieces = cubePyramids(a).map(({ apex, base, dir }, k) => {
    const [o, [p, q, r, s]] = [v3(apex), [base[0], base[1], base[2], base[3]].map(v3)]
    const geometry = new THREE.BufferGeometry().setFromPoints([p, q, r, p, r, s, o, p, q, o, q, r, o, r, s, o, s, p])
    geometry.computeVertexNormals()
    const edges = new THREE.EdgesGeometry(geometry)
    const material = new THREE.MeshStandardMaterial({ color: PIECES[k], side: THREE.DoubleSide })
    owned.push(geometry, edges, material)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.add(new THREE.LineSegments(edges, lineMaterial))
    const label = textSprite('⅓', a * 0.3)
    label.sprite.position.copy(p).add(r).multiplyScalar(0.5)
    mesh.add(label.sprite)
    sprites.push(label)
    extra.add(mesh)
    return { mesh, dir: v3(dir), label: label.sprite }
  })
  const show = (q: number) => {
    const back = clamp01((q - 0.6) / 0.3) // 하나씩 나온 뒤 다 같이 돌아온다
    pieces.forEach(({ mesh, dir, label }, k) => {
      const out = clamp01((q - k * 0.2) / 0.2) * (1 - back)
      mesh.position.copy(dir).multiplyScalar(a * 0.7 * out)
      label.visible = out > 0
    })
  }
  const bounds = new THREE.Box3(new THREE.Vector3(-a * 0.6 + middle.x, range.min.y, -a / 2), new THREE.Vector3(middle.x + a * 1.1, range.min.y + a * 1.7, a * 1.2))
  const lesson = afterPour(pour, extra, show, bounds, () => {
    sprites.forEach((s) => s.dispose())
    extra.removeFromParent()
    owned.forEach((x) => x.dispose())
  })
  // 끝나면 세로 모서리에 공식의 h (정육면체 한 변을 각뿔 높이로 잡았다)
  const [x0, y0] = [middle.x + a * 0.4, range.min.y]
  return withEndLines(lesson, [{ from: new THREE.Vector3(x0, y0, a / 2), to: new THREE.Vector3(x0, y0 + a, a / 2), color: LENGTH_COLOR.h }], a * 0.02)
}
