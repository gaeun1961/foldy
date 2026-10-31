// 사진 크기 줄이기 검사. 실행: frontend 폴더에서 `npm test` (canvas 가 없는 Node 라 fitSize 만)
import { fitSize, rotatedSize } from './photoPrep.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const eq = (a: unknown, b: unknown) => check(JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`)

// 휴대폰 사진 (세로·가로): 긴 변이 1600 으로, 비율은 그대로
eq(fitSize(3024, 4032, 1600), { w: 1200, h: 1600 })
eq(fitSize(4032, 3024, 1600), { w: 1600, h: 1200 })
// 이미 작으면 그대로 (키우지 않는다)
eq(fitSize(800, 600, 1600), { w: 800, h: 600 })
eq(fitSize(1600, 900, 1600), { w: 1600, h: 900 })
// 아주 가늘어도 0 이 되지 않는다
eq(fitSize(10000, 2, 1600), { w: 1600, h: 1 })

// 돌리기: 홀수 번이면 가로세로가 바뀐다
eq(rotatedSize(1200, 1600, 1), { w: 1600, h: 1200 })
eq(rotatedSize(1200, 1600, 2), { w: 1200, h: 1600 })
eq(rotatedSize(1200, 1600, 3), { w: 1600, h: 1200 })

console.log('ok: 사진 줄이기 (긴 변 맞춤, 비율 유지, 키우지 않음), 돌린 크기')
