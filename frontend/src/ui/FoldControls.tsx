import { useEffect, useRef } from 'react'
import { useOperation } from './activity'
import type { ViewerProps } from '../viewer'
import { foldPercent, stepTargets, unfoldOf } from './foldStatus.ts'
import { animate, SPEEDS, type Speed } from './player.ts'

// 접기 슬라이더 + 이전·다음 단계 + 접기(펼치기) 버튼 (docs/specs/ui.md 화면 배치 4번, 방식은 보기 메뉴, 빠르기는 아래 바). 값은 뷰어의 펼침 값 s (0 = 입체, 1 = 전개도).
// 단계별은 면을 하나씩 접고 단계 사이에 잠깐 멈춘다 (ui.md 친절한 설명 원칙)
export type FoldMode = NonNullable<ViewerProps['foldMode']>
interface Props {
  unfold: number
  onChange: (unfold: number) => void
  mode: FoldMode
  speed: Speed
  steps: number // 단계 수 (0 이면 단계별 접기 없음)
  onPlayingChange: (playing: boolean) => void // 애니메이션 시작·끝 (상태 배지가 숫자를 숨기려고)
  target?: { unfold: number } // 이 값까지 부드럽게 움직인다 (챗봇 화면 조작). 새 객체가 올 때마다 한 번
}

export function FoldControls({ unfold, onChange, mode, speed, steps, onPlayingChange, target }: Props) {
  const { begin, end } = useOperation()
  const cancel = useRef(() => {})
  const stop = () => {
    cancel.current()
    onPlayingChange(false)
    end()
  }
  useEffect(() => () => cancel.current(), [])
  useEffect(stop, [mode]) // eslint-disable-line react-hooks/exhaustive-deps -- 보기 메뉴에서 방식을 바꾸면 멈춘다

  // targets 를 차례로 지나간다 (player.ts: 구간마다 이징, 구간 사이에 pauseMs 멈춤, 시간은 거리에 비례)
  const play = (targets: number[], msPerUnit: number, pauseMs: number) => {
    stop()
    if (targets.length === 0) return
    onPlayingChange(true)
    begin({ label: '멈추기', run: stop })
    cancel.current = animate(unfold, targets, msPerUnit, pauseMs, onChange, () => { onPlayingChange(false); end() })
  }

  const stepMode = mode === 'step' && steps > 0
  const { allMs, stepMs, pauseMs } = SPEEDS[speed]
  const go = (dir: 'fold' | 'unfold', oneStep = false) => {
    if (!stepMode) return play([dir === 'fold' ? 0 : 1], allMs, 0)
    const targets = stepTargets(unfold, steps, dir)
    play(oneStep ? targets.slice(0, 1) : targets, stepMs * steps, pauseMs)
  }

  // 챗봇이 정한 접기 값: 단계 멈춤 없이 "한 번에" 속도로 간다
  useEffect(() => {
    if (target) play([target.unfold], allMs, 0)
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps -- target 이 바뀔 때만

  const percent = foldPercent(unfold)
  return (
    // 두 줄: 슬라이더 / 버튼 (ui.md 눈높이)
    <div className="fold-controls">
      <label className="slider-row">
        <span>접기</span>
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          aria-valuetext={`접기 ${percent}%`}
          onPointerDown={stop}
          onChange={(e) => {
            stop()
            onChange(unfoldOf(Number(e.target.value)))
          }}
        />
        <output>{percent}%</output>
      </label>
      <div className="fold-buttons">
        {stepMode && (
          <>
            <button type="button" className="secondary" disabled={percent <= 0} onClick={() => go('unfold', true)}>
              이전 단계
            </button>
            <button type="button" className="secondary" disabled={percent >= 100} onClick={() => go('fold', true)}>
              다음 단계
            </button>
          </>
        )}
        {/* 주요 버튼 하나: 끝까지 접었으면 펼치기 */}
        <button type="button" className="primary" onClick={() => go(percent >= 100 ? 'unfold' : 'fold')}>
          {percent >= 100 ? '◀ 펼치기' : '접기 ▶'}
        </button>
      </div>
    </div>
  )
}

// 3D 뷰 구석의 단계 표시: 단계 수만큼 점. 다 접힌 단계는 채우고, 접히는 중인 단계는 크게. 글은 없다
export function StepDots({ unfold, steps }: { unfold: number; steps: number }) {
  const at = (1 - unfold) * steps
  const done = Math.floor(at + 1e-6)
  return (
    <div className="step-dots" role="img" aria-label={`${steps}단계 중 ${done}단계 접음`}>
      {[...Array(steps).keys()].map((k) => (
        <span key={k} className={k < done ? 'done' : k < at ? 'current' : ''} />
      ))}
    </div>
  )
}
