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

// 받침이 있으면 "이", 없으면 "가" (원기둥이 / 직육면체가)
function subjectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '이' : '가'
}

export function foldStatus(shape: ShapeKind, unfold: number) {
  const name = SHAPE_NAME[shape]
  const percent = foldPercent(unfold)
  if (percent >= 100) return { done: true, text: `빈틈없이 ${name}${subjectParticle(name)} 됐어요` }
  if (percent <= 0) return { done: false, text: `${name} · 펼친 상태` }
  return { done: false, text: `${name} · 접는 중 ${percent}%` }
}
