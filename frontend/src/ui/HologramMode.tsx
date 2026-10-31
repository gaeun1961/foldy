// 홀로그램 보기 (제안, 팀 합의 전: docs/proposals/hologram/spec.md "화면").
// 아래 바의 "홀로그램"을 누르면 지금 도형이 화면 전체 홀로그램으로 바뀐다. 화면을 누르면 설정 판이 열리고 닫힌다.
// 휴대폰·태블릿을 눕히고 가운데 사각형 위에 아크릴 피라미드를 뒤집어 올려서 본다. 설정은 기기에 남는다 (localStorage)
import { useEffect, useRef, useState } from 'react'
import type { ShapeScene } from '../shared/types.ts'
import { HologramViewer } from '../viewer'

// calibrated: 이 기기에서 맞춤 화면을 끝냈는지. 처음 쓰는 기기는 맞춤 화면부터 연다 (spec.md "맞춤 화면")
type Settings = { center: number; elevation: number; mirror: boolean; spin: boolean; fold: boolean; showGuide: boolean; calibrated: boolean }
const DEFAULTS: Settings = { center: 0.2, elevation: 20, mirror: false, spin: true, fold: true, showGuide: true, calibrated: false }
const KEY = 'foldy-hologram'

function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

const TOGGLES: { key: 'mirror' | 'spin' | 'fold' | 'showGuide'; label: string }[] = [
  { key: 'fold', label: '접었다 펴기' },
  { key: 'spin', label: '천천히 돌기' },
  { key: 'showGuide', label: '놓을 자리' },
  { key: 'mirror', label: '좌우 반전' },
]

type WakeLock = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLock> } }

export function HologramMode({ scene, onClose }: { scene: ShapeScene; onClose: () => void }) {
  const [settings, setSettings] = useState(loadSettings)
  const [panel, setPanel] = useState(true) // 처음에는 놓는 법을 보여 준다
  const [calibrating, setCalibrating] = useState(() => !settings.calibrated) // 맞춤 화면: 도형 대신 칸마다 방향 글자
  const root = useRef<HTMLDivElement>(null)
  const wakeLock = useRef<WakeLock | null>(null)

  const change = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next }
    setSettings(merged)
    localStorage.setItem(KEY, JSON.stringify(merged))
  }

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
      <HologramViewer scene={scene} {...settings} calibrate={calibrating} onTap={() => setPanel(!panel)} />
      {panel && calibrating && (
        <div className="hologram-panel">
          <h2>피라미드 맞추기</h2>
          <p>피라미드를 가운데 흰 사각형 위에 뒤집어 올리고, 둘레를 한 바퀴 돌며 보세요. 화면을 누르면 이 판이 닫혀요.</p>
          <ol className="hologram-checks">
            <li>내 앞 칸에 빨간 <b>앞</b>이 보이게 기기를 돌려요. 오른쪽으로 돌아가면 <b>오른쪽</b>이 보여요</li>
            <li>글자가 거울 글씨면 아래 <b>좌우 반전</b>을 눌러요</li>
            <li>화살표가 아래를 가리키면 피라미드가 뒤집혔어요. 좁은 쪽이 화면에 닿게 놓아요</li>
            <li>피라미드 꼭지가 흰 사각형과 겹치게 <b>가운데</b>를 맞춰요</li>
          </ol>
          <label className="slider-row">
            가운데
            <input type="range" min={0.05} max={0.45} step={0.01} value={settings.center} onChange={(e) => change({ center: Number(e.target.value) })} />
            <output>{Math.round(settings.center * 100)}%</output>
          </label>
          <div className="hologram-options">
            <button type="button" className="menu-button" aria-pressed={settings.mirror} onClick={() => change({ mirror: !settings.mirror })}>
              좌우 반전
            </button>
          </div>
          <div className="hologram-actions">
            <button type="button" className="secondary-button" onClick={close}>
              돌아가기
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                change({ calibrated: true })
                setCalibrating(false)
                setPanel(false)
              }}
            >
              맞춤 완료
            </button>
          </div>
        </div>
      )}
      {panel && !calibrating && (
        <div className="hologram-panel">
          <h2>홀로그램</h2>
          <p>휴대폰이나 태블릿을 눕히고, 가운데 사각형 위에 아크릴 피라미드를 뒤집어 올려요. 화면을 누르면 이 판이 열리고 닫혀요.</p>
          <label className="slider-row">
            가운데
            <input type="range" min={0.05} max={0.45} step={0.01} value={settings.center} onChange={(e) => change({ center: Number(e.target.value) })} />
            <output>{Math.round(settings.center * 100)}%</output>
          </label>
          <label className="slider-row">
            높이
            <input type="range" min={0} max={45} step={1} value={settings.elevation} onChange={(e) => change({ elevation: Number(e.target.value) })} />
            <output>{settings.elevation}°</output>
          </label>
          <div className="hologram-options">
            {TOGGLES.map(({ key, label }) => (
              <button key={key} type="button" className="menu-button" aria-pressed={settings[key]} onClick={() => change({ [key]: !settings[key] })}>
                {label}
              </button>
            ))}
          </div>
          <div className="hologram-actions">
            <button type="button" className="secondary-button" onClick={() => setCalibrating(true)}>
              피라미드 맞추기
            </button>
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
