// 상태 배지 문구 검사. 실행: frontend 폴더에서 `npm test`
import { foldPercent, foldStatus, unfoldOf } from './foldStatus.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const eq = (a: unknown, b: unknown) => check(JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`)

// 방향: 펼침 값 s = 1(전개도) → 접기 0%, s = 0(입체) → 접기 100%
eq(foldPercent(1), 0)
eq(foldPercent(0), 100)
eq(foldPercent(0.57), 43)
eq(unfoldOf(foldPercent(0.25)), 0.25)

eq(foldStatus('cuboid', 1), { done: false, text: '직육면체 · 펼친 상태' })
eq(foldStatus('cuboid', 0.57), { done: false, text: '직육면체 · 접는 중 43%' })
eq(foldStatus('cuboid', 0), { done: true, text: '빈틈없이 직육면체가 됐어요' })
// 받침 있는 이름은 "이"
eq(foldStatus('cylinder', 0).text, '빈틈없이 원기둥이 됐어요')
eq(foldStatus('cone', 0).text, '빈틈없이 원뿔이 됐어요')
// 반올림 경계: 99.6% 는 "접는 중"이 아니라 다 접힘으로 보인다 (슬라이더와 숫자가 같게)
eq(foldStatus('cube', 0.004).done, true)
console.log('ok: 접기 % 방향, 상태 배지 문구, 조사')
