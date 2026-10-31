// node lab/holoLayout.test.ts
import assert from 'node:assert/strict'
import { fitDistance, regions, rightOf, uvOf } from './holoLayout.ts'

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

// 아래 칸 쪽 사람(+y 를 보며 섬)의 오른쪽은 +x, 오른쪽 칸 쪽 사람(−x 를 보며 섬)의 오른쪽은 +y
assert.deepEqual(rightOf([0, -1]), [1, 0])
assert.deepEqual(rightOf([1, 0]), [0, 1])
assert.deepEqual(rightOf([0, 1]), [-1, 0])
assert.deepEqual(rightOf([-1, 0]), [0, -1])

const L = 100
const c = 20
const rs = regions(L, c)
assert.deepEqual(
  rs.map((r) => r.side),
  ['bottom', 'right', 'top', 'left'],
)

// 아래 칸 사다리꼴: 안쪽 변 y = −10 (x −10..10), 바깥 변 y = −50 (x −50..50)
const bottom = rs[0]
assert.deepEqual(bottom.corners, [
  [-10, -10],
  [10, -10],
  [50, -50],
  [-50, -50],
])

// 텍스처 좌표: 안쪽 변 가운데 = (0.5, 0), 바깥 오른쪽 모서리 = (1, 1)
for (const r of rs) {
  const [u0, v0] = uvOf(r, L, c, [r.outward[0] * 10, r.outward[1] * 10])
  close(u0, 0.5)
  close(v0, 0)
  const [u1, v1] = uvOf(r, L, c, r.corners[2])
  close(u1, 1)
  close(v1, 1)
  const [um] = uvOf(r, L, c, r.corners[2], true)
  close(um, 0)
}

// 아래 칸에서 화면 오른쪽(+x)이 그림 오른쪽: 거울 면은 좌우를 바꾸지 않는다
assert.ok(uvOf(bottom, L, c, [30, -30])[0] > 0.5)
// 오른쪽 칸에서는 화면 위(+y)가 그 사람의 오른쪽
assert.ok(uvOf(rs[1], L, c, [30, 20])[0] > 0.5)

// 카메라: 아래 = 앞(+z, 0), 오른쪽 = +x(π/2)
close(rs[0].azimuth, 0)
close(rs[1].azimuth, Math.PI / 2)

// 크기 맞추기: 반지름이 두 배면 거리도 두 배, 칸이 커지면 (같은 비율이므로) 거리는 같다
const d1 = fitDistance(L, c, 1, 35)
close(fitDistance(L, c, 2, 35), 2 * d1)
close(fitDistance(2 * L, 2 * c, 1, 35), d1)
// 구가 그림 세로 안에 들어간다: 구의 각지름 < 세로 시야각
const h = (L - c) / 2
assert.ok(2 * Math.atan(1 / d1) < ((35 * Math.PI) / 180) * (Math.min((c + L) / 2, h) / h) + 1e-9)

console.log('holoLayout ok')
