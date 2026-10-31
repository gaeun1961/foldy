// 홀로그램 보기 (제안, 팀 합의 전: docs/proposals/hologram/spec.md "화면").
// 아래 바의 "홀로그램"을 누르면 지금 도형이 화면 전체 홀로그램으로 바뀐다. 화면을 누르면 설정 판이 열리고 닫힌다.
// 설정은 기기마다 다른 "가운데"(피라미드 꼭지 크기) 하나뿐이다. 기기에 남는다 (localStorage)
import { useEffect, useRef, useState } from 'react'
import type { ShapeScene } from '../shared/types.ts'
import { HologramViewer } from '../viewer'

const KEY = 'foldy-hologram-center'
const DEFAULT_CENTER = 0.2

function loadCenter() {
  const saved = Number(localStorage.getItem(KEY))
  return saved >= 0.05 && saved <= 0.45 ? saved : DEFAULT_CENTER
}

type WakeLock = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLock> } }

export function HologramMode({ scene, onClose }: { scene: ShapeScene; onClose: () => void }) {
  const [center, setCenter] = useState(loadCenter)
  const [panel, setPanel] = useState(true) // 처음에는 놓는 법을 보여 준다
  const root = useRef<HTMLDivElement>(null)
  const wakeLock = useRef<WakeLock | null>(null)

  const close = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.fullscreenElement && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      wakeLock.current?.release().catch(() => {})
    }
  }, [onClose])

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await root.current?.requestFullscreen()
    } catch {
      // iOS Safari 는 전체 화면이 없다. 홈 화면에 추가해서 쓴다
    }
    try {
      // 화면 꺼짐 방지. HTTPS 나 localhost 에서만 된다
      wakeLock.current ??= (await (navigator as WakeLockNavigator).wakeLock?.request('screen')) ?? null
    } catch {
      // 지원하지 않으면 그냥 둔다
    }
    setPanel(false)
  }

  return (
    <div className="hologram" ref={root} role="dialog" aria-label="홀로그램">
      {/* 판이 열려 있을 때만 피라미드 놓을 자리(가운데 사각형)를 그린다: 가운데를 맞출 때만 필요하다 */}
      <HologramViewer scene={scene} center={center} showGuide={panel} onTap={() => setPanel(!panel)} />
      {panel && (
        <div className="hologram-panel">
          <h2>홀로그램</h2>
          <p>휴대폰이나 태블릿을 눕히고, 가운데 사각형 위에 아크릴 피라미드를 뒤집어 올려요. 피라미드 꼭지에 맞게 가운데를 조절하고, 화면을 누르면 이 판이 닫혀요.</p>
          <label className="slider-row">
            가운데
            <input
              type="range"
              min={0.05}
              max={0.45}
              step={0.01}
              value={center}
              onChange={(e) => {
                const next = Number(e.target.value)
                setCenter(next)
                localStorage.setItem(KEY, String(next))
              }}
            />
            <output>{Math.round(center * 100)}%</output>
          </label>
          <div className="hologram-actions">
            <button type="button" className="secondary-button" onClick={fullscreen}>
              전체 화면
            </button>
            <button type="button" className="primary-button" onClick={close}>
              돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
