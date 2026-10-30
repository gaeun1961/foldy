// 설명 모드의 상단 상태 배지 문구 (docs/specs/ui.md). foldStatus.ts 와 따로 둔 것은 그 파일의 npm test 가 뷰어(React)를 끌어오지 않게 하려고
import { LESSON_LABEL, type Lesson } from '../viewer'

export function lessonStatus(lesson: Lesson, playing: boolean) {
  const label = LESSON_LABEL[lesson.kind]
  if (lesson.progress >= 1 && !playing) return { done: true, wrong: false, text: `${label}${objectParticle(label)} 다 봤어요` }
  if (lesson.progress <= 0) return { done: false, wrong: false, text: `${label} · 시작 전` }
  return { done: false, wrong: false, text: `${label} · 보는 중` }
}

// 받침이 있으면 "을", 없으면 "를" (대각선을 / 부피를)
function objectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를'
}
