import { useEffect, useRef, useState } from 'react'

// 실측용 계측기 (#142): 주소에 ?perf 를 붙이면(App 이 판단) 화면 오른쪽 위에 초당 프레임(최근 1초 평균)과 가장 느린 프레임,
// 사진 읽기 시간(읽는 중이면 지난 초, 끝나면 걸린 초)을 보인다. 휴대폰에서 펜 연출이 끊기는지 보려고
export function PerfMeter({ reading }: { reading: boolean }) {
  const [text, setText] = useState(['- fps', '읽기 -'])
  const since = useRef<number | null>(null)
  const reads = useRef<number[]>([]) // 끝난 읽기 시간(초), 최근 것이 앞

  useEffect(() => {
    if (reading) since.current = performance.now()
    else if (since.current !== null) {
      reads.current = [Math.round((performance.now() - since.current) / 100) / 10, ...reads.current].slice(0, 3)
      since.current = null
    }
  }, [reading])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let start = last
    let count = 0
    let worst = 0
    const loop = (now: number) => {
      worst = Math.max(worst, now - last)
      last = now
      count++
      if (now - start >= 1000) {
        const fps = Math.round((count * 1000) / (now - start))
        const read = since.current !== null ? `읽는 중 ${Math.round((now - since.current) / 100) / 10}초` : reads.current.length ? `읽기 ${reads.current.join(' · ')}초` : '읽기 -'
        setText([`${fps} fps · 느린 프레임 ${Math.round(worst)}ms`, read])
        start = now
        count = 0
        worst = 0
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="perf-meter" aria-hidden>
      {text[0]}
      <br />
      {text[1]}
    </div>
  )
}
