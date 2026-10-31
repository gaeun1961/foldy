// 사진 UV 검사 (worksheets.md W6). 실행: frontend 폴더에서 `npm test`
import { faceUvs, glowPixels, netPointUv, paperLuminance } from './photoUv.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const near = (a: { u: number; v: number }, u: number, v: number, msg: string) => check(Math.abs(a.u - u) < 1e-9 && Math.abs(a.v - v) < 1e-9, `${msg}: (${a.u}, ${a.v}) != (${u}, ${v})`)

// 정사각형 사진(가로세로 1)이 면 하나에 꼭 맞게 깔리면 면 네 꼭짓점 = 사진 네 귀퉁이 (v 는 위가 1)
const face = { x: 2, y: 1, w: 2, h: 2 }
const fit = { x: 3, y: 2, size: 2, angle: 0 }
const [tl, tr, br, bl] = faceUvs(face, fit, 1)
near(tl, 0, 1, '왼쪽 위')
near(tr, 1, 1, '오른쪽 위')
near(br, 1, 0, '오른쪽 아래')
near(bl, 0, 0, '왼쪽 아래')

// 가로로 긴 사진(4:3): 세로가 size × 3/4 라서 면 위아래가 사진 밖(v < 0, v > 1)으로 나간다
near(netPointUv(3, 1, fit, 4 / 3), 0.5, 1 + 1 / 6, '가로 사진 위')
near(netPointUv(2, 2, fit, 4 / 3), 0, 0.5, '가로 사진 왼쪽')

// 사진을 칸에서 시계 방향 90° 돌려 깔았으면 사진의 왼쪽 위 귀퉁이가 화면 오른쪽 위로 간다 → 면의 오른쪽 위 꼭짓점 = 사진 (0, 1)
near(faceUvs(face, { ...fit, angle: 90 }, 1)[1], 0, 1, '90° 돌린 사진')

// 홀로그램 사진: 종이는 면 색의 평소 불투명도(base), 검은 선은 불투명. 색은 흰색(면 색과 곱해져 형형색색)
const px = new Uint8ClampedArray([250, 250, 250, 255, 20, 20, 20, 255])
glowPixels(px, 0.35, 250)
check(Math.abs(px[3] - Math.round(255 * 0.35)) <= 1, `종이는 면 색 그대로: ${px[3]}`)
check(px[7] === 255 && px[4] === 255, `선은 불투명: ${px[4]}, ${px[7]}`)
// 그늘진 사진: 종이가 회색(170)이어도 사진에서 재서 종이로 본다 (회색 막이 남지 않게)
const shade = new Uint8ClampedArray(4 * 100)
for (let i = 0; i < 100; i++) shade.set(i < 90 ? [170, 170, 170, 255] : [40, 40, 40, 255], i * 4)
check(Math.abs(paperLuminance(shade) - 170) <= 1, `그늘진 종이 밝기: ${paperLuminance(shade)}`)
glowPixels(shade, 0.35)
check(Math.abs(shade[3] - Math.round(255 * 0.35)) <= 1 && shade[99 * 4 + 3] === 255, `그늘진 종이는 면 색, 선은 진하게: ${shade[3]}, ${shade[99 * 4 + 3]}`)

console.log('ok: 사진 UV (꼭 맞는 면, 가로 사진, 돌린 사진), 홀로그램 사진 (종이는 면 색 그대로, 선 진하게, 그늘진 종이 밝기 재기)')
