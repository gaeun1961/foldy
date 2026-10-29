import { useState } from 'react'
import { mockScene, sampleScenes } from '../shared/mock'
import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types'
import { foldStepCount, netCheck, Viewer, type DrawState } from '../viewer'
import { FoldControls, StepDots, type FoldMode } from './FoldControls'
import { foldStatus, unfoldOf } from './foldStatus.ts'
import { ChatPanel } from './ChatPanel'
import { LineControls } from './LineControls'
import { ViewOptions, type ViewOptionValues } from './ViewOptions'

// 선 긋기 안내 문구 (ui.md "안내 문구")
const DRAW_HINT: Record<DrawState, string> = {
  idle: '점 두 개를 눌러 선을 그어 보세요',
  picked: '이을 점을 하나 더 눌러 보세요',
  'no-path': '이 두 점은 이을 수 없어요',
}

// 화면 배치 자리만 잡아 둔 상태. TODO(UI): 업로드 → /analyze (TODO-11), 전체 디자인(TODO-14)
export default function App() {
  // 선 없이 시작해서 학생이 직접 긋는다 (목 데이터의 선은 backend MOCK_SCENE·검사와 맞추려고 그대로 둔다). 선 긋기로 lines 가 늘어난다
  const [scene, setScene] = useState<ShapeScene>({ ...mockScene, lines: [] })
  const [unfold, setUnfold] = useState(1) // 펼친 전개도에서 시작해서 "접기 ▶"로 접어 본다
  const [foldMode, setFoldMode] = useState<FoldMode>('step') // 기본은 면을 하나씩 접기
  const [playing, setPlaying] = useState(false) // 접기 애니메이션 중이면 배지에서 숫자를 숨긴다
  const [view, setView] = useState<ViewOptionValues>({ showHiddenEdges: true, showVertexLabels: true, showMatchingEdges: true }) // 보기 옵션 체크박스, 기본값은 ui.md
  const [drawLines, setDrawLines] = useState(false)
  // 챗봇 화면 조작 (api.md "/chat 화면 조작"): 꼭짓점 강조, 접기 목표
  const [highlight, setHighlight] = useState<number[]>([])
  const [foldTarget, setFoldTarget] = useState<{ unfold: number }>()
  const [edgeDivisions, setEdgeDivisions] = useState<2 | 3 | 4>(2)
  const [drawState, setDrawState] = useState<DrawState>('idle')
  // 한 번 그은 선이 선분 몇 개로 저장됐는지 (면에 걸친 선은 2~3개). 선 지우기는 그은 선 하나를 통째로 지운다
  const [strokes, setStrokes] = useState<number[]>(() => scene.lines.map(() => 1))
  // 방금 다른 면을 이은 선의 길 후보와 지금 그은 후보 번호. "다른 길"을 누르면 마지막 선을 다음 후보로 바꾼다
  const [route, setRoute] = useState<{ routes: Line<PolyhedronPoint>[][]; index: number } | null>(null)
  const steps = foldStepCount(scene)
  const status = foldStatus(scene.shape, unfold, playing, netCheck(scene)?.closed ?? true)

  // 예시 전개도 불러오기 (사진 업로드 TODO-11 전까지). 펼친 상태에서 새로 시작한다
  const loadSample = (next: ShapeScene) => {
    setScene(next)
    setUnfold(1)
    setStrokes(next.lines.map(() => 1))
    setRoute(null)
    setHighlight([])
    setDrawState('idle')
  }

  // 안내 문구: 애니메이션 중에는 숨기고, 선 긋기 안내가 먼저다 (ui.md 친절한 설명 원칙, 안내 문구)
  const hint = playing ? null : drawLines ? DRAW_HINT[drawState] : view.showMatchingEdges && steps > 0 ? '같은 색 모서리끼리 만나요' : null

  return (
    <div className="layout">
      <header>foldy</header>
      <section className="upload">
        <h2>학습지 사진</h2>
        <p>사진 업로드 영역 (준비 중)</p>
        <label className="sample-picker">
          예시 전개도
          <select defaultValue={0} onChange={(e) => loadSample(sampleScenes[Number(e.target.value)].scene)}>
            {sampleScenes.map((s, i) => (
              <option key={s.name} value={i}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <main className="viewer">
        <div className="viewer-canvas">
          <Viewer
            scene={scene}
            unfold={unfold}
            foldMode={foldMode}
            {...view}
            highlightVertices={highlight}
            drawLines={drawLines}
            edgeDivisions={edgeDivisions}
            onSceneChange={(next) => {
              setStrokes([...strokes, next.lines.length - scene.lines.length])
              setScene(next)
            }}
            onDrawState={setDrawState}
            onRouteChoices={(routes) => setRoute(routes.length > 1 ? { routes, index: 0 } : null)}
          />
          <div className={`status-badge${status.done ? ' done' : ''}${status.wrong ? ' wrong' : ''}`} role="status">
            {status.done && '✔ '}
            {status.wrong && '✖ '}
            {status.text}
          </div>
          {foldMode === 'step' && steps > 0 && <StepDots unfold={unfold} steps={steps} />}
          {hint && <p className="viewer-hint">{hint}</p>}
        </div>
        <FoldControls unfold={unfold} onChange={setUnfold} mode={foldMode} onModeChange={setFoldMode} steps={steps} onPlayingChange={setPlaying} target={foldTarget} />
        <LineControls
          drawing={drawLines}
          onDrawingChange={(on) => {
            setDrawLines(on)
            setDrawState('idle')
          }}
          divisions={edgeDivisions}
          onDivisionsChange={setEdgeDivisions}
          lineCount={strokes.length}
          route={route && { index: route.index, count: route.routes.length }}
          onNextRoute={() => {
            if (!route) return
            const index = (route.index + 1) % route.routes.length
            const kept = scene.lines.slice(0, scene.lines.length - strokes[strokes.length - 1])
            setScene({ ...scene, lines: [...kept, ...route.routes[index]] } as ShapeScene)
            setStrokes([...strokes.slice(0, -1), route.routes[index].length])
            setRoute({ ...route, index })
          }}
          onEraseLast={() => {
            setScene({ ...scene, lines: scene.lines.slice(0, scene.lines.length - strokes[strokes.length - 1]) } as ShapeScene)
            setStrokes(strokes.slice(0, -1))
            setRoute(null)
          }}
        />
        <ViewOptions values={view} onChange={setView} />
      </main>
      <ChatPanel
        scene={scene}
        onView={({ highlightVertices, foldPercent }) => {
          setHighlight(highlightVertices)
          if (foldPercent !== null) setFoldTarget({ unfold: unfoldOf(foldPercent) })
        }}
      />
    </div>
  )
}
