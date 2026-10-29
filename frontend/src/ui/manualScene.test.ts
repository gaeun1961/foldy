// 직접 만들기 검사. 실행: frontend 폴더에서 `npm test`
import type { ShapeScene } from '../shared/types.ts'
import { CELL, crossScene, fitToBox, gridScene, overlaps, PHOTO_W, rectOf } from './manualScene.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}

// 치수로 만들기: 십자형, 라벨이 없으면 ㄱ~ㅇ, 십자형 선은 그대로
const box = crossScene('cuboid', { width: 5, depth: 2, height: 3 })
check(box.net.layout === 'cross' && box.vertexLabels[0] === 'ㄱ' && box.lines.length === 0, '처음 만든 직육면체')
const withLine = { ...box, lines: [{ from: { vertex: 0 }, to: { vertex: 5 } }] } as ShapeScene
check(crossScene('cuboid', { width: 6, depth: 2, height: 3 }, withLine).lines.length === 1, '치수를 바꿔도 선은 남음')
check(crossScene('cube', { edge: 2 }, withLine).shape === 'cube', '정육면체로 바꾸기')

// 전개도 그리기: 끈 두 칸 → 직사각형 (방향 상관없음)
const r = rectOf({ x: 3, y: 2 }, { x: 1, y: 4 })
check(r.x === 1 && r.y === 2 && r.w === 3 && r.h === 3, `끈 칸 → 면 ${JSON.stringify(r)}`)
check(overlaps(r, { x: 2, y: 3, w: 1, h: 1 }) && !overlaps(r, { x: 4, y: 2, w: 1, h: 3 }), '겹침은 넓이가 있을 때만 (맞닿는 것은 아님)')

// 정사각형 6개 십자형 → 정육면체, 바르게 닫힘
const sq = (x: number, y: number) => ({ x, y, w: 1, h: 1 })
const cube = gridScene([sq(1, 0), sq(0, 1), sq(1, 1), sq(2, 1), sq(3, 1), sq(1, 2)])
check(cube.shape === 'cube' && cube.net.layout === 'grid' && cube.net.faces.length === 6, '그린 정육면체 전개도')
// 크기가 다른 면 → 직육면체, 치수는 변 길이에서
const cuboid = gridScene([
  { x: 2, y: 2, w: 4, h: 3 },
  { x: 0, y: 2, w: 2, h: 3 },
  { x: 6, y: 2, w: 2, h: 3 },
  { x: 8, y: 2, w: 4, h: 3 },
  { x: 2, y: 0, w: 4, h: 2 },
  { x: 2, y: 5, w: 4, h: 2 },
])
check(cuboid.shape === 'cuboid' && JSON.stringify(cuboid.size) === JSON.stringify({ width: 4, depth: 2, height: 3 }), `그린 직육면체 치수 ${JSON.stringify(cuboid.size)}`)
// 잘못 그린 전개도도 고치지 않고 그대로 (접히는지·닫히는지는 viewer faceTree.test.ts 가 본다)
check(gridScene([sq(0, 1), sq(1, 1), sq(2, 1), sq(3, 1), sq(0, 0), sq(1, 0)]).net.layout === 'grid', '잘못 그린 전개도')

// 사진에서 고른 네모 → 사진 위치: 네모 귀퉁이가 전개도 귀퉁이에 온다 (가로로 긴 사진 4:3, 네모와 전개도 비율이 같을 때)
const fit = fitToBox({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 }, 4 / 3, [{ x: 1, y: 2, w: 8, h: 3 }])
const c = PHOTO_W / 2
const at = (u: number, v: number) => [fit.x + c + fit.scale * (u - c), fit.y + c + fit.scale * (v - c)] // 칸의 SVG transform 그대로
const [dw, dh] = [PHOTO_W, PHOTO_W * 0.75]
const near = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6
check(near(at(0.25 * dw, (PHOTO_W - dh) / 2 + 0.5 * dh), [1 * CELL, 2 * CELL]), `네모 왼쪽 위 → 전개도 왼쪽 위 ${JSON.stringify(fit)}`)
check(near(at(0.75 * dw, (PHOTO_W - dh) / 2 + 0.75 * dh), [9 * CELL, 5 * CELL]), '네모 오른쪽 아래 → 전개도 오른쪽 아래')

console.log('ok: 직접 만들기 (치수로 만들기, 전개도 그리기 → 정육면체·직육면체·잘못된 전개도, 사진 네모에 맞추기)')
