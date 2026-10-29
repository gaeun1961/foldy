// 면 표시 (docs/specs/ui.md 화면 배치 5번): 고를 수 있는 표시와 면 하나에 쓰기
import type { NetFace } from '../shared/types.ts'

// 고르는 칸 배치(두 줄, 6칸): 1 2 3 ◎ ● ★ / 4 5 6 색칠 지우기(두 칸)
export const MARKS = ['1', '2', '3', '◎', '●', '★', '4', '5', '6', '색칠', '지우기'] as const
export type Mark = (typeof MARKS)[number]

// 같은 글자를 다시 쓰면 지운다. 색칠은 켜고 끈다. 지우기는 글자·색칠 모두
export function markFace(face: NetFace, mark: Mark): NetFace {
  const { x, y, w, h, text, fill } = face
  if (mark === '지우기') return { x, y, w, h }
  if (mark === '색칠') return { x, y, w, h, ...(text && { text }), ...(!fill && { fill: true }) }
  return { x, y, w, h, ...(text !== mark && { text: mark }), ...(fill && { fill }) }
}

// 면 표시 중 안내 문구
export const markHint = (mark: Mark) => (mark === '지우기' ? '표시를 지울 면을 눌러 보세요' : mark === '색칠' ? '색칠할 면을 눌러 보세요' : `${mark} 표시를 쓸 면을 눌러 보세요`)
