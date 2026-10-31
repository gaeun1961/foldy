// 홀로그램 화면 배치 검사 (docs/proposals/hologram/spec.md, 팀 합의 전).
// 실행: frontend 폴더에서 `npm test` (= node src/viewer/holoLayout.test.ts)
import { fitDistance, regions, rightOf, uvOf } from './holoLayout.ts'

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message)
}
const close = (a: number, b: number, what: string) => check(Math.abs(a - b) < 1e-9, `${what}: ${a} != ${b}`)
const same = (a: unknown, b: unknown, what: string) => check(JSON.stringify(a) === JSON.stringify(b), `${what}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)

// 아래 칸 쪽 사람(+y 를 보며 섬)의 오른쪽은 +x, 오른쪽 칸 쪽 사람(−x 를 보며 섬)의 오른쪽은 +y
same(rightOf([0, -1]), [1, 0], '아래 칸 오른쪽')
same(rightOf([1, 0]), [0, 1], '오른쪽 칸 오른쪽')
same(rightOf([0, 1]), [-1, 0], '위 칸 오른쪽')
same(rightOf([-1, 0]), [0, -1], '왼쪽 칸 오른쪽')

const L = 100
const c = 20
const rs = regions(L, c)
same(
  rs.map((r) => r.side),
  ['bottom', 'right', 'top', 'left'],
  '칸 순서',
)

// 아래 칸 사다리꼴: 안쪽 변 y = −10 (x −10..10), 바깥 변 y = −50 (x −50..50)
const bottom = rs[0]
same(
  bottom.corners,
  [
    [-10, -10],
    [10, -10],
    [50, -50],
    [-50, -50],
  ],
  '아래 칸 꼭짓점',
)

// 텍스처 좌표: 안쪽 변 가운데 = (0.5, 0), 바깥 오른쪽 모서리 = (1, 1), 좌우 반전이면 u 가 0
for (const r of rs) {
  const [u0, v0] = uvOf(r, L, c, [r.outward[0] * 10, r.outward[1] * 10])
  close(u0, 0.5, `${r.side} 안쪽 가운데 u`)
  close(v0, 0, `${r.side} 안쪽 가운데 v`)
  const [u1, v1] = uvOf(r, L, c, r.corners[2])
  close(u1, 1, `${r.side} 바깥 오른쪽 u`)
  close(v1, 1, `${r.side} 바깥 오른쪽 v`)
  close(uvOf(r, L, c, r.corners[2], true)[0], 0, `${r.side} 좌우 반전 u`)
}

// 아래 칸에서 화면 오른쪽(+x)이 그림 오른쪽: 거울 면은 좌우를 바꾸지 않는다. 오른쪽 칸에서는 화면 위(+y)가 그 사람의 오른쪽
check(uvOf(bottom, L, c, [30, -30])[0] > 0.5, '아래 칸 좌우')
check(uvOf(rs[1], L, c, [30, 20])[0] > 0.5, '오른쪽 칸 좌우')

// 카메라: 아래 = 앞(+z, 0), 오른쪽 = +x(π/2)
close(rs[0].azimuth, 0, '아래 칸 카메라')
close(rs[1].azimuth, Math.PI / 2, '오른쪽 칸 카메라')

// 크기 맞추기: 반지름이 두 배면 거리도 두 배, 칸이 같은 비율로 커지면 거리는 같다
const d1 = fitDistance(L, c, 1, 35)
close(fitDistance(L, c, 2, 35), 2 * d1, '반지름 두 배')
close(fitDistance(2 * L, 2 * c, 1, 35), d1, '칸 두 배')
// 구가 칸 가운데 폭과 그림 세로 안에 들어간다: 구의 각지름 ≤ 세로 시야각 × (들어갈 폭 / 그림 세로)
const h = (L - c) / 2
check(2 * Math.atan(1 / d1) <= ((35 * Math.PI) / 180) * (Math.min((c + L) / 2, h) / h) + 1e-9, '구가 칸 안에')

console.log('ok: 홀로그램 배치 (사다리꼴 4칸, 반사 방향, 카메라 방향, 크기 맞추기)')
