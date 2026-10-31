// 펜 지그재그 길 검사. 실행: frontend 폴더에서 `npm test`
import { pathLength, penSweep, pointAt } from './penSweep.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

const box = { x: 2, y: 1, w: 10, h: 6 }
const { points, width } = penSweep(box.x, box.y, box.w, box.h, 8)

// 줄마다 두 점
check(points.length === 16, `점 개수 ${points.length}`)
// 모든 점은 네모 안 (가장자리 포함)
for (const p of points) check(p.x >= box.x - 1e-9 && p.x <= box.x + box.w + 1e-9 && p.y >= box.y - 1e-9 && p.y <= box.y + box.h + 1e-9, `네모 밖 ${JSON.stringify(p)}`)
// 같은 줄의 두 점은 / 방향 (x + y 가 같다)
for (let k = 0; k < points.length; k += 2) check(near(points[k].x + points[k].y, points[k + 1].x + points[k + 1].y), `${k / 2}번째 줄이 / 방향이 아님`)
// 첫 줄은 왼쪽 위 귀퉁이 근처에서, 위로 올라가며 시작 (왼쪽 아래 → 오른쪽 위)
check(points[0].x + points[0].y < box.x + box.y + 2, '왼쪽 위에서 시작하지 않음')
check(points[1].y < points[0].y && points[1].x > points[0].x, '첫 줄이 / 위로 가지 않음')
// 둘째 줄은 반대로 내려온다 (지그재그)
check(points[3].y > points[2].y && points[3].x < points[2].x, '둘째 줄이 / 아래로 오지 않음')
// 줄은 \ 방향으로 나아간다 (x + y 가 줄마다 커진다)
for (let k = 2; k < points.length; k += 2) check(points[k].x + points[k].y > points[k - 2].x + points[k - 2].y, '\\ 방향으로 나아가지 않음')
// 마지막 줄은 오른쪽 아래 귀퉁이 근처
const last = points[points.length - 1]
check(last.x + last.y > box.x + box.w + box.y + box.h - 2, '오른쪽 아래에서 끝나지 않음')
// 선 굵기가 줄 사이(거리 step/√2)보다 굵어 틈이 없다
check(width > (16 / 8) / Math.SQRT2, `선 굵기 ${width}`)

// 길이와 펜 위치: 처음·끝·가운데 (직각 꺾은선 길이 3 + 4)
const bent = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }]
check(near(pathLength(bent), 7), `길이 ${pathLength(bent)}`)
check(JSON.stringify(pointAt(bent, 0)) === JSON.stringify({ x: 0, y: 0 }), '처음')
check(near(pointAt(bent, 5).x, 3) && near(pointAt(bent, 5).y, 2), '꺾은 뒤 2')
check(JSON.stringify(pointAt(bent, 99)) === JSON.stringify({ x: 3, y: 4 }), '끝 넘음')

console.log('penSweep 검사 통과')
