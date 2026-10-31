// 곡면 말기 검사: 펴면 평면 전개도, 말면 입체, 말아도 길이가 그대로, 둘레와 밑면 원이 맞닿는다. 실행: `npm test`
import { conePoint, curvedLinePoints, cylinderPoint, discAngle, discPoint, sidePoint, standPoint, topDiscPoint, type Point } from './curved.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const EPS = 1e-9

// 곡면 위 선: 펴면 직선, 말면 곡면 위, 말아도 길이가 그대로
{
  const length = (points: Point[]) => points.slice(1).reduce((sum, p, i) => sum + dist(p, points[i]), 0)
  const pipe = { radius: 3, height: 10 }
  const helix = curvedLinePoints('cylinder', pipe, { from: { bottom: 0 }, to: { top: 360 } })
  const diagonal = Math.hypot(6 * Math.PI, 10)
  check(Math.abs(length(helix(1)) - diagonal) < 1e-6 && helix(1).every((p) => Math.abs(p[1]) < EPS), '펴면 직사각형 대각선')
  check(Math.abs(length(helix(0)) - diagonal) < 0.01 && helix(0).every(([x, y]) => Math.abs(Math.hypot(x, y - 3) - 3) < EPS), '말면 원기둥 위 나선, 길이 그대로')
  check(dist(helix(0)[0], [helix(0)[64][0], helix(0)[64][1], helix(0)[0][2]]) < 1e-9 && Math.abs(helix(0)[0][2] - helix(0)[64][2] - 10) < EPS, '한 바퀴 돌아 바로 위')
  const cone = { radius: 1, height: Math.sqrt(15) } // 모선 4
  const toApex = curvedLinePoints('cone', cone, { from: { base: 90 }, to: { apex: true } })
  check(Math.abs(length(toApex(1)) - 4) < 1e-6 && Math.abs(length(toApex(0)) - 4) < 1e-6, '원뿔: 꼭짓점까지 모선 길이')
  const chord = curvedLinePoints('cone', cone, { from: { surface: { angle: 0, r: 1 } }, to: { surface: { angle: 360, r: 1 } } })
  check(Math.abs(length(chord(1)) - 8 * Math.SQRT1_2) < 1e-6 && Math.abs(length(chord(0.4)) - 8 * Math.SQRT1_2) < 0.01, '원뿔: 중심각 90° 의 현, 말아도 길이 그대로')
}

// 원기둥 r = 2, h = 5
{
  const [r, h] = [2, 5]
  const around = Math.PI * r
  check(dist(cylinderPoint(1.5, 1, 1, r), [1.5, 0, 1]) < EPS, '펴면 평면 직사각형')
  // 말면: 축(y = r, x = 0)에서 거리 r, 양쪽 끝이 한 자리에서 만난다
  for (const a of [-around, -1, 0, 2, around]) {
    const [x, y] = cylinderPoint(a, 0, 0, r)
    check(Math.abs(Math.hypot(x, y - r) - r) < EPS, `원기둥 위 점 ${a}`)
  }
  check(dist(cylinderPoint(-around, 1, 0, r), cylinderPoint(around, 1, 0, r)) < EPS, '자른 선 둘이 만난다')
  // 중간에도 길이가 그대로: 잘게 나눈 호 길이의 합이 가로 길이
  for (const s of [0, 0.3, 0.7]) {
    let total = 0
    for (let i = 0; i < 2000; i++) total += dist(cylinderPoint(-around + (i / 2000) * 2 * around, 0, s, r), cylinderPoint(-around + ((i + 1) / 2000) * 2 * around, 0, s, r))
    check(Math.abs(total - 2 * around) < 1e-3, `원기둥 s = ${s} 길이 ${total}`)
  }
  // 말면 위 둘레가 위 원 둘레 위에 온다
  const angle = discAngle('cylinder', 0, r, 0)
  const center = discPoint(0, r, angle, -h / 2, -1)
  check(Math.abs(angle - Math.PI / 2) < EPS, '원기둥 밑면은 90° 돈다')
  for (const a of [-3, 0, 4]) check(Math.abs(dist(cylinderPoint(a, -h / 2, 0, r), center) - r) < EPS, `위 둘레 ${a}`)
  // 똑바로 세우면: 아래 원은 바닥, 위 원은 높이 h
  const low = discPoint(0, r, angle, h / 2, 1)
  check(Math.abs(standPoint(low, angle, h / 2)[1]) < 1e-9 && Math.abs(standPoint(center, angle, h / 2)[1] - h) < 1e-9, '원기둥이 똑바로 선다')
  for (let k = 0; k <= 20; k++)
    for (let i = 0; i <= 40; i++) {
      const p = standPoint(cylinderPoint(-around + (i / 40) * 2 * around, h / 2, k / 20, r), discAngle('cylinder', k / 20, r, 0), h / 2)
      check(p[1] > -0.03 * h, `원기둥 s = ${k / 20} 바닥 아래 ${p[1]}`)
    }
}

// 원뿔 r = 2, h = 4
{
  const [r, h] = [2, 4]
  const L = Math.hypot(r, h)
  const half = (Math.PI * r) / L
  const apex: Point = [0, 0, 0]
  check(dist(conePoint(3, 0.5, 1, r, L), [3 * Math.sin(0.5), 0, 3 * Math.cos(0.5)]) < EPS, '펴면 평면 부채꼴')
  // 어떤 s 에서도 꼭짓점까지 거리가 그대로
  for (const s of [0, 0.4, 1]) for (const f of [-half, 0.3, half]) check(Math.abs(dist(conePoint(L, f, s, r, L), apex) - L) < 1e-9, `모선 길이 s = ${s}`)
  check(dist(conePoint(L, -half, 0, r, L), conePoint(L, half, 0, r, L)) < 1e-9, '자른 선 둘이 만난다')
  // 호 길이도 그대로
  for (const s of [0, 0.5]) {
    let total = 0
    for (let i = 0; i < 2000; i++) total += dist(conePoint(L, -half + (i / 2000) * 2 * half, s, r, L), conePoint(L, -half + ((i + 1) / 2000) * 2 * half, s, r, L))
    check(Math.abs(total - 2 * Math.PI * r) < 1e-3, `원뿔 s = ${s} 호 길이 ${total}`)
  }
  // 말면 호가 밑면 원 둘레 위에 온다 (90° 만 돌리면 맞지 않는다)
  const center = discPoint(0, r, discAngle('cone', 0, r, L), L, 1)
  for (const f of [-half, -0.5, 0, 0.9, half]) check(Math.abs(dist(conePoint(L, f, 0, r, L), center) - r) < 1e-9, `호와 밑면 원 ${f}`)
  // 입체 높이: 꼭짓점에서 밑면 가운데까지 h
  check(Math.abs(dist(apex, center) - h) < 1e-9, `원뿔 높이 ${dist(apex, center)}`)
  // 똑바로 세우면: 밑면 원은 바닥에 있고, 꼭짓점은 그 가운데 바로 위 h
  const angle = discAngle('cone', 0, r, L)
  const standing = standPoint(apex, angle, L)
  check(Math.abs(standing[1] - h) < 1e-9 && Math.abs(standing[2] - (L + r)) < 1e-9, `원뿔 꼭짓점 ${standing}`)
  check(Math.abs(standPoint(center, angle, L)[1]) < 1e-9, '밑면 원 가운데는 바닥')
  // 접는 동안 도형이 책 아래로 내려가지 않는다 (크기의 3% 까지 봐준다)
  for (let k = 0; k <= 20; k++) {
    const s = k / 20
    for (let i = 0; i <= 40; i++) {
      const p = standPoint(conePoint(L, -half + (i / 40) * 2 * half, s, r, L), discAngle('cone', s, r, L), L)
      check(p[1] > -0.03 * L, `원뿔 s = ${s} 바닥 아래 ${p[1]}`)
    }
  }
}

// 겉넓이 설명의 펼치기: 입체에서 시작해 평면이 되고, 가로 = 밑면 둘레, 부채꼴 호 = 밑면 둘레
{
  const cylinder = { radius: 2, height: 5 }
  const low = sidePoint('cylinder', cylinder, 0.3, 0, 0)
  check(Math.abs(Math.hypot(low[0], low[2]) - 2) < 1e-9 && Math.abs(low[1]) < 1e-9, `원기둥 밑 둘레 ${low}`)
  check(Math.abs(sidePoint('cylinder', cylinder, 0.3, 1, 0)[1] - 5) < 1e-9, '원기둥 위 둘레는 높이 5')
  const [a, b] = [sidePoint('cylinder', cylinder, 0, 0, 1), sidePoint('cylinder', cylinder, 1, 0, 1)]
  check(Math.abs(dist(a, b) - 2 * Math.PI * 2) < 1e-9 && Math.abs(a[1]) < 1e-9, `펼친 가로 = 밑면 둘레 ${dist(a, b)}`)
  check(Math.abs(dist(sidePoint('cylinder', cylinder, 0.5, 0, 1), sidePoint('cylinder', cylinder, 0.5, 1, 1)) - 5) < 1e-9, '펼친 세로 = 높이')
  // 윗면: 입체에서 높이 5 위의 원, 펼치면 바닥
  check(Math.abs(topDiscPoint(cylinder, 0, 0, 0)[1] - 5) < 1e-9 && Math.hypot(topDiscPoint(cylinder, 0, 0, 0)[0], topDiscPoint(cylinder, 0, 0, 0)[2]) < 1e-9, '윗면 가운데')
  check(Math.abs(topDiscPoint(cylinder, 0.2, 1, 1)[1]) < 1e-9, '펼친 윗면은 바닥')
  const cone = { radius: 3, height: 4 } // 모선 5
  const apex = sidePoint('cone', cone, 0.5, 1, 0)
  check(Math.hypot(apex[0], apex[2]) < 1e-9 && Math.abs(apex[1] - 4) < 1e-9, `원뿔 꼭짓점 ${apex}`)
  const rim = sidePoint('cone', cone, 0.2, 0, 0)
  check(Math.abs(Math.hypot(rim[0], rim[2]) - 3) < 1e-9 && Math.abs(rim[1]) < 1e-9, `원뿔 밑 둘레 ${rim}`)
  const flatApex = sidePoint('cone', cone, 0.5, 1, 1)
  for (const u of [0, 0.3, 1]) check(Math.abs(dist(sidePoint('cone', cone, u, 0, 1), flatApex) - 5) < 1e-9, '펼치면 반지름이 모선')
  let arc = 0
  for (let i = 0; i < 2000; i++) arc += dist(sidePoint('cone', cone, i / 2000, 0, 1), sidePoint('cone', cone, (i + 1) / 2000, 0, 1))
  check(Math.abs(arc - 2 * Math.PI * 3) < 1e-3, `부채꼴 호 = 밑면 둘레 ${arc}`)
}

console.log('ok: 곡면 말기 (원기둥·원뿔 평면, 입체, 길이 그대로, 둘레와 밑면 원, 똑바로 서기, 겉넓이 펼치기)')
