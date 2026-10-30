import { useEffect, useRef, useState } from 'react'
import type { ShapeScene } from '../shared/types'
import { LESSON_LABEL, lessonStepCount, lessonSummary, RELATION_COLORS, SIMILAR_SCALES, type Lesson, type LessonKind } from '../viewer'
import { StepDots } from './FoldControls'
import { stepTargets } from './foldStatus.ts'
import { animate, SPEEDS, type Speed } from './player'

// 설명 모드 조작 (docs/specs/ui.md 화면 배치 8번). 설명을 고르면 입체로 접고 한 단계(한 층)씩 보여준다.
// 값은 lesson.progress (0 = 시작 전, 1 = 끝). 단계·속도·멈춤은 접기 패널과 같은 방식 (player.ts)
interface Props {
  scene: ShapeScene
  lesson: Lesson | null
  onChange: (lesson: Lesson | null) => void
  onPlayingChange: (playing: boolean) => void
}

const KINDS = Object.keys(LESSON_LABEL) as LessonKind[]

export function LessonControls({ scene, lesson, onChange, onPlayingChange }: Props) {
  const [speed, setSpeed] = useState<Speed>('normal')
  const [playing, setPlaying] = useState(false)
  const cancel = useRef(() => {})
  const stop = () => {
    cancel.current()
    setPlaying(false)
    onPlayingChange(false)
  }
  useEffect(() => () => cancel.current(), [])

  const steps = lesson ? lessonStepCount(scene, lesson.kind, lesson.scale) : 0
  const progress = lesson?.progress ?? 0
  const set = (p: number) => lesson && onChange({ ...lesson, progress: p })

  // progress 는 접기의 unfold 와 방향이 반대(1 이 끝)라서 stepTargets 에는 1 − progress 를 넘기고 결과도 뒤집는다
  const go = (dir: 'next' | 'back', oneStep = false) => {
    stop()
    if (!lesson) return
    const targets = stepTargets(1 - progress, steps, dir === 'next' ? 'fold' : 'unfold').map((u) => 1 - u)
    const list = oneStep ? targets.slice(0, 1) : targets
    if (list.length === 0) return
    setPlaying(true)
    onPlayingChange(true)
    const { stepMs, pauseMs } = SPEEDS[speed]
    cancel.current = animate(progress, list, stepMs * steps, pauseMs, set, () => {
      setPlaying(false)
      onPlayingChange(false)
    })
  }

  // 닮음비를 바꾸면 처음부터 다시 본다
  const pickScale = (k: number) => {
    stop()
    if (lesson) onChange({ ...lesson, scale: k, progress: 0 })
  }

  const pick = (kind: LessonKind) => {
    stop()
    onChange(lesson?.kind === kind ? null : { kind, progress: 0 })
  }

  const summary = lesson && progress >= 1 && !playing ? lessonSummary(scene, lesson.kind, lesson.scale) : null
  const available = KINDS.filter((k) => lessonStepCount(scene, k) > 0)
  if (available.length === 0) return null

  return (
    <div className="lesson-controls">
      <div className="option-row">
        <div className="toggle-row" role="group" aria-label="설명">
          {available.map((k) => (
            <button key={k} type="button" aria-pressed={lesson?.kind === k} onClick={() => pick(k)}>
              {LESSON_LABEL[k]}
            </button>
          ))}
        </div>
        {lesson?.kind === 'similar' && (
          <div className="toggle-row" role="group" aria-label="닮음비">
            {SIMILAR_SCALES.map((k) => (
              <button key={k} type="button" aria-pressed={(lesson.scale ?? 2) === k} onClick={() => pickScale(k)}>
                {k}배
              </button>
            ))}
          </div>
        )}
        {lesson && (
          <div className="toggle-row" role="group" aria-label="속도">
            {(Object.keys(SPEEDS) as Speed[]).map((s) => (
              <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {SPEEDS[s].label}
              </button>
            ))}
          </div>
        )}
      </div>
      {lesson && (
        <>
          <div className="fold-buttons">
            <button type="button" className="secondary" disabled={progress <= 0} onClick={() => go('back')}>
              ◀ 처음으로
            </button>
            <button type="button" className="secondary" disabled={progress <= 0} onClick={() => go('back', true)}>
              이전 단계
            </button>
            <button type="button" className="secondary" disabled={progress >= 1} onClick={() => go('next', true)}>
              다음 단계
            </button>
            <button type="button" className="primary" disabled={progress >= 1} onClick={() => go('next')}>
              {LESSON_LABEL[lesson.kind]} 보기 ▶
            </button>
          </div>
          {/* 위치 관계 색 설명: 기준 + 지금까지 나온 종류만 (뒤에 나올 답을 미리 보이지 않게, ui.md) */}
          {lesson.kind === 'edge-relations' && (
            <ul className="relation-legend" aria-label="색 설명">
              <li>
                <span style={{ background: RELATION_COLORS.ref }} />
                기준 모서리
              </li>
              {['평행', '만남', '꼬인 위치'].map(
                (name, k) =>
                  progress > k / 3 + 1e-6 && (
                    <li key={name}>
                      <span style={{ background: RELATION_COLORS.kinds[k] }} />
                      {name}
                    </li>
                  ),
              )}
            </ul>
          )}
          {/* 공식은 애니메이션이 끝나고 멈춘 뒤에만 (ui.md 친절한 설명 원칙) */}
          {summary && (
            <p className="lesson-summary" role="status">
              {summary.formula} = <strong>{summary.value}</strong>
            </p>
          )}
        </>
      )}
    </div>
  )
}

// 3D 뷰 오른쪽 위 단계 표시를 설명 모드에서도 쓴다 (progress → unfold 방향으로 바꿔서)
export function LessonDots({ scene, lesson }: { scene: ShapeScene; lesson: Lesson }) {
  const steps = lessonStepCount(scene, lesson.kind, lesson.scale)
  return steps > 0 ? <StepDots unfold={1 - lesson.progress} steps={steps} /> : null
}
