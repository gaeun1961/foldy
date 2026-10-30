// 설명 모드의 상단 상태 배지 문구 (docs/specs/ui.md). foldStatus.ts 와 따로 둔 것은 그 파일의 npm test 가 뷰어(React)를 끌어오지 않게 하려고
import { LESSON_LABEL, type Lesson } from '../viewer'

export function lessonStatus(lesson: Lesson, playing: boolean) {
  const label = LESSON_LABEL[lesson.kind]
  if (lesson.progress >= 1 && !playing) return { done: true, wrong: false, text: `${label}를 다 봤어요` }
  if (lesson.progress <= 0) return { done: false, wrong: false, text: `${label} · 시작 전` }
  return { done: false, wrong: false, text: `${label} · 보는 중` }
}
