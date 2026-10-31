// 무대 검사 (docs/proposals/hologram/spec.md "무대", 팀 합의 전).
// 실행: frontend 폴더에서 `npm test` (= node src/viewer/stage.test.ts)
import * as THREE from 'three'
import type { ShapeKind, ShapeScene } from '../shared/types.ts'
import { boundsOf, buildStage, stageSupported } from './stage.ts'
import { HOLOGRAM, PAPER, type LookName } from './theme.ts'
import { WORKSHEET_SCENES } from './worksheetScenes.ts'

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message)
}
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

const scene = (shape: string, size: object, labels = 0, layout = 'default') =>
  ({ shape, size, vertexLabels: Array(labels).fill(null), lines: [], net: { layout } }) as unknown as ShapeScene

// 모든 도형 종류의 기본 치수와 단계별 접기 단계 수 (ui/manualScene.ts SHAPES 와 같은 기본 치수).
// ShapeKind 에 도형이 늘면 이 표가 없어서 타입 검사(npm run build)가 실패한다: 새 도형도 홀로그램이 되는지 여기서 같이 확인한다.
// 아직 홀로그램을 만들지 않을 도형이면 supported: false 로 적는다 (그러면 홀로그램 버튼이 꺼진다)
const KINDS: Record<ShapeKind, { name: string; scene: ShapeScene; steps: number; supported?: false }> = {
  cuboid: { name: '직육면체', scene: scene('cuboid', { width: 4, depth: 2, height: 3 }, 8, 'cross'), steps: 5 },
  cube: { name: '정육면체', scene: scene('cube', { edge: 3 }, 8, 'cross'), steps: 5 },
  'regular-tetrahedron': { name: '정사면체', scene: scene('regular-tetrahedron', { edge: 3 }, 4), steps: 3 },
  'regular-octahedron': { name: '정팔면체', scene: scene('regular-octahedron', { edge: 3 }, 6), steps: 7 },
  'regular-dodecahedron': { name: '정십이면체', scene: scene('regular-dodecahedron', { edge: 2 }, 20), steps: 11 },
  'regular-icosahedron': { name: '정이십면체', scene: scene('regular-icosahedron', { edge: 2 }, 12), steps: 19 },
  prism: { name: '사각기둥', scene: scene('prism', { sides: 4, edge: 3, height: 5 }, 8), steps: 5 },
  pyramid: { name: '사각뿔', scene: scene('pyramid', { sides: 4, edge: 6, height: 4 }, 5), steps: 4 },
  cylinder: { name: '원기둥', scene: scene('cylinder', { radius: 3, height: 5 }), steps: 0 },
  cone: { name: '원뿔', scene: scene('cone', { radius: 3, height: 4 }), steps: 0 },
  sphere: { name: '구', scene: scene('sphere', { radius: 6 }), steps: 0 },
}
const SCENES: [string, ShapeScene, number][] = Object.values(KINDS)
  .filter((k) => {
    check(stageSupported(k.scene) === (k.supported ?? true), `${k.name}: 홀로그램 지원 여부가 표와 같아야`)
    return k.supported ?? true
  })
  .map((k) => [k.name, k.scene, k.steps])

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

// 실제 학습지에서 온 도형 (worksheetScenes.ts): 면이 2개 이상이면 열리고 접힌다. 잘못 그린 전개도도 그대로 접힌다 (닫히지 않아도 된다).
// 면이 하나뿐(전개도 고르기 문제)이면 홀로그램을 열 수 없다 (버튼이 꺼진다)
for (const { photo, scene: s, note } of WORKSHEET_SCENES) {
  const what = `학습지 ${photo} (${note.slice(0, 20)})`
  const faces = s.net.layout === 'grid' ? s.net.faces.length : 6
  check(stageSupported(s) === faces >= 2, `${what}: 면 ${faces}개면 홀로그램 ${faces >= 2 ? '가능' : '불가'}`)
  if (faces < 2) continue
  const stage = buildStage(s, HOLOGRAM)!
  check(near(stage.solid.min.y, 0, 1e-6), `${what}: 바닥에 놓여야`)
  stage.apply(1, 'step')
  const flat = boundsOf(stage.object)
  check(near(flat.min.y, 0, 1e-3) && near(flat.max.y, 0, 1e-3), `${what}: 펼치면 바닥에 납작하게`)
  check(stage.all.containsBox(flat) && stage.all.containsBox(stage.solid), `${what}: 전체 범위`)
  stage.dispose()
}

// 3D 디자인 토큰: 두 테마가 같은 이름의 면 모양을 모두 갖는다. 홀로그램은 검은 바탕에서 보이도록 모서리가 밝고 굵다
const names: LookName[] = ['normal', 'active', 'faded', 'ghost', 'filled', 'overlap', 'opposite']
for (const n of names) check(n in PAPER.looks && n in HOLOGRAM.looks, `토큰 ${n}`)
const brightness = (hex: string) => new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l
check(brightness(HOLOGRAM.looks.normal.edge) > 0.8, '홀로그램 모서리는 밝아야')
check(brightness(HOLOGRAM.curved.plain) > 0.8 && brightness(HOLOGRAM.sphereRing) > 0.8, '홀로그램 곡면 선은 밝아야')
check(HOLOGRAM.edgeWidth > 0 && PAPER.edgeWidth === 0, '홀로그램만 굵은 선')

console.log(`ok: 무대 (모든 도형 종류 × 종이·홀로그램 테마, 학습지 도형 ${WORKSHEET_SCENES.length}개: 단계 수, 바닥·가운데, 전체 범위, 펼치기, 면 1개는 불가), 3D 디자인 토큰`)
