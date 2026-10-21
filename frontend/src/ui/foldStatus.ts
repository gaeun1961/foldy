// 접기 슬라이더 값과 상단 상태 배지 문구 (docs/specs/ui.md)
import type { ShapeKind } from '../shared/types.ts'

export const SHAPE_NAME: Record<ShapeKind, string> = {
  cuboid: '직육면체',
  cube: '정육면체',
  'regular-tetrahedron': '정사면체',
  'regular-octahedron': '정팔면체',
  'regular-dodecahedron': '정십이면체',
  'regular-icosahedron': '정이십면체',
  cylinder: '원기둥',
  cone: '원뿔',
}

// 접기 % = (1 − s) × 100. 0% = 전개도, 100% = 입체 (뷰어의 펼침 값 s 와 방향이 반대)
export const foldPercent = (unfold: number) => Math.round((1 - unfold) * 100)
export const unfoldOf = (percent: number) => 1 - percent / 100

// 단계별 접기 버튼이 지나갈 단계 경계(펼침 값)들, 가까운 것부터. 단계 n 개면 경계는 s = 1 − k/n (k = 0..n).
// 'fold' 는 s 가 줄어드는 쪽(접기 ▶, 다음 단계), 'unfold' 는 늘어나는 쪽. 경계 위에 있으면 그 경계는 건너뛴다
export function stepTargets(unfold: number, n: number, dir: 'fold' | 'unfold') {
  const at = (1 - unfold) * n // 지금까지 접힌 단계 수 (소수)
  const out: number[] = []
  if (dir === 'fold') for (let k = Math.floor(at + 1e-6) + 1; k <= n; k++) out.push(1 - k / n)
  else for (let k = Math.ceil(at - 1e-6) - 1; k >= 0; k--) out.push(1 - k / n)
  return out
}

// 받침이 있으면 "이", 없으면 "가" (원기둥이 / 직육면체가)
function subjectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '이' : '가'
}

// playing: 애니메이션 중이면 숫자를 숨긴다 (ui.md 친절한 설명 원칙: 숫자는 멈춘 뒤에)
export function foldStatus(shape: ShapeKind, unfold: number, playing = false) {
  const name = SHAPE_NAME[shape]
  const percent = foldPercent(unfold)
  if (playing && percent > 0 && percent < 100) return { done: false, text: `${name} · 접는 중` }
  if (percent >= 100) return { done: true, text: `빈틈없이 ${name}${subjectParticle(name)} 됐어요` }
  if (percent <= 0) return { done: false, text: `${name} · 펼친 상태` }
  return { done: false, text: `${name} · 접는 중 ${percent}%` }
}
