// 상태 배지 문구 검사. 실행: frontend 폴더에서 `npm test`
import { foldPercent, foldStatus, stepTargets, unfoldOf } from './foldStatus.ts'

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
// 애니메이션 중에는 숫자 없이 "접는 중"만, 끝에 닿으면 평소 문구
eq(foldStatus('cuboid', 0.57, true), { done: false, text: '직육면체 · 접는 중' })
eq(foldStatus('cuboid', 1, true).text, '직육면체 · 펼친 상태')
eq(foldStatus('cuboid', 0, true).done, true)

// 단계 경계: 5단계, 펼침 값 1 → 0.8 → 0.6 → 0.4 → 0.2 → 0
const near = (a: number[], b: number[]) => check(a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9), `${a} != ${b}`)
near(stepTargets(1, 5, 'fold'), [0.8, 0.6, 0.4, 0.2, 0])
near(stepTargets(1, 5, 'unfold'), [])
near(stepTargets(0, 5, 'fold'), [])
near(stepTargets(0, 5, 'unfold'), [0.2, 0.4, 0.6, 0.8, 1])
near(stepTargets(unfoldOf(40), 5, 'fold'), [0.4, 0.2, 0]) // 경계(접기 40%) 위: 그 경계는 건너뜀
near(stepTargets(unfoldOf(40), 5, 'unfold'), [0.8, 1])
near(stepTargets(0.5, 5, 'fold'), [0.4, 0.2, 0]) // 단계 중간(슬라이더로 옮김): 가까운 경계부터
near(stepTargets(0.5, 5, 'unfold'), [0.6, 0.8, 1])
// 잘못 그린 전개도: 다 접었을 때만 "전개도가 아니에요"
eq(foldStatus('cube', 0, false, false), { done: false, wrong: true, text: '정육면체 전개도가 아니에요 · 면이 겹치거나 비어요' })
eq(foldStatus('cube', 0.5, false, false).text, '정육면체 · 접는 중 50%')
console.log('ok: 접기 % 방향, 상태 배지 문구, 조사, 단계 경계')
