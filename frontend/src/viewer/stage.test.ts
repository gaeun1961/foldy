// 무대 검사 (docs/proposals/hologram/spec.md "무대", 팀 합의 전).
// 실행: frontend 폴더에서 `npm test` (= node src/viewer/stage.test.ts)
import * as THREE from 'three'
import type { ShapeScene } from '../shared/types.ts'
import { boundsOf, buildStage, stageSupported } from './stage.ts'
import { HOLOGRAM, PAPER, type LookName } from './theme.ts'

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message)
}
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

const scene = (shape: string, size: object, labels = 0, layout = 'default') =>
  ({ shape, size, vertexLabels: Array(labels).fill(null), lines: [], net: { layout } }) as unknown as ShapeScene

// 치수로 만들기의 모든 도형 (ui/manualScene.ts SHAPES 와 같은 기본 치수)
const SCENES: [string, ShapeScene, number][] = [
  ['직육면체', scene('cuboid', { width: 4, depth: 2, height: 3 }, 8, 'cross'), 5],
  ['정육면체', scene('cube', { edge: 3 }, 8, 'cross'), 5],
  ['정사면체', scene('regular-tetrahedron', { edge: 3 }, 4), 3],
  ['정팔면체', scene('regular-octahedron', { edge: 3 }, 6), 7],
  ['정십이면체', scene('regular-dodecahedron', { edge: 2 }, 20), 11],
  ['정이십면체', scene('regular-icosahedron', { edge: 2 }, 12), 19],
  ['사각기둥', scene('prism', { sides: 4, edge: 3, height: 5 }, 8), 5],
  ['사각뿔', scene('pyramid', { sides: 4, edge: 6, height: 4 }, 5), 4],
  ['원기둥', scene('cylinder', { radius: 3, height: 5 }), 0],
  ['원뿔', scene('cone', { radius: 3, height: 4 }), 0],
  ['구', scene('sphere', { radius: 6 }), 0],
]

const width = (b: THREE.Box3) => Math.max(b.max.x - b.min.x, b.max.z - b.min.z)

for (const theme of [PAPER, HOLOGRAM]) {
  for (const [name, s, steps] of SCENES) {
    const what = `${name} (${theme.name})`
    check(stageSupported(s), `${what}: 무대가 그릴 수 있어야`)
    const stage = buildStage(s, theme)
    check(stage !== null, `${what}: 무대가 만들어져야`)
    if (!stage) continue
    check(stage.steps === steps, `${what}: 단계 수 ${stage.steps} != ${steps}`)
    check(stage.foldable === (s.shape !== 'sphere'), `${what}: 접는 도형인지`)

    // 다 접은 입체: 바닥(y = 0)에 놓이고, 수평 가운데가 원점 (돌려도 제자리)
    const solid = stage.solid
    check(!solid.isEmpty(), `${what}: 입체 범위가 있어야`)
    check(near(solid.min.y, 0, 1e-6), `${what}: 바닥에 놓여야 (min.y ${solid.min.y})`)
    const c = solid.getCenter(new THREE.Vector3())
    check(near(c.x, 0, 1e-6) && near(c.z, 0, 1e-6), `${what}: 수평 가운데가 원점이어야 (${c.x}, ${c.z})`)
    check(stage.all.containsBox(solid), `${what}: 전체 범위가 입체를 담아야`)

    // 펼치면 바닥에 넓게 눕는다 (구는 그대로)
    if (stage.foldable) {
      for (const mode of ['all', 'step'] as const) {
        stage.apply(1, mode)
        const flat = boundsOf(stage.object)
        check(width(flat) > width(solid) + 1e-6, `${what}: 펼치면 넓어져야 (${mode})`)
        check(stage.all.containsBox(flat), `${what}: 전체 범위가 전개도를 담아야 (${mode})`)
        if (steps > 0) check(near(flat.min.y, 0, 1e-3) && near(flat.max.y, 0, 1e-3), `${what}: 다면체 전개도는 바닥에 납작하게 (${mode}, y ${flat.min.y}..${flat.max.y})`)
      }
    }
    stage.resize(800, 300)
    stage.dispose()
  }
}

// 그릴 수 없는 장면은 null (지금 모든 도형을 그리므로 모양만 확인)
check(buildStage(scene('cuboid', { width: 1, depth: 1, height: 1 }, 8, 'cross'), PAPER) !== null, '직육면체 1×1×1')

// 3D 디자인 토큰: 두 테마가 같은 이름의 면 모양을 모두 갖는다. 홀로그램은 검은 바탕에서 보이도록 모서리가 밝고 굵다
const names: LookName[] = ['normal', 'active', 'faded', 'ghost', 'filled', 'overlap', 'opposite']
for (const n of names) check(n in PAPER.looks && n in HOLOGRAM.looks, `토큰 ${n}`)
const brightness = (hex: string) => new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l
check(brightness(HOLOGRAM.looks.normal.edge) > 0.8, '홀로그램 모서리는 밝아야')
check(brightness(HOLOGRAM.curved.plain) > 0.8 && brightness(HOLOGRAM.sphereRing) > 0.8, '홀로그램 곡면 선은 밝아야')
check(HOLOGRAM.edgeWidth > 0 && PAPER.edgeWidth === 0, '홀로그램만 굵은 선')

console.log('ok: 무대 (모든 도형 × 종이·홀로그램 테마: 단계 수, 바닥·가운데, 전체 범위, 펼치기), 3D 디자인 토큰')
