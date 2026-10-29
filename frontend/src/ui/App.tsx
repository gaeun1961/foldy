import { useState } from 'react'
import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types'
import { foldStepCount, netCheck, Viewer, type DrawState, type FacePick } from '../viewer'
import { FoldControls, StepDots, type FoldMode } from './FoldControls'
import { foldStatus, SHAPE_NAME, unfoldOf } from './foldStatus.ts'
import { ChatPanel } from './ChatPanel'
import { FaceMarks } from './FaceMarks'
import { markFace, markHint, type Mark } from './markFace.ts'
import { LineControls } from './LineControls'
import { ManualInput } from './ManualInput'
import { crossToGrid, fitToBox, netPhoto, NO_FIT } from './manualScene.ts'
import { PhotoUpload } from './PhotoUpload'
import { ViewOptions, type ViewOptionValues } from './ViewOptions'

// 선 긋기 안내 문구 (ui.md "안내 문구")
const DRAW_HINT: Record<DrawState, string> = {
  idle: '점 두 개를 눌러 선을 그어 보세요',
  picked: '이을 점을 하나 더 눌러 보세요',
  'no-path': '이 두 점은 이을 수 없어요',
}

// 마주 보는 면 보기 안내 (ui.md 안내 문구)
function facePickHint({ text, opposite }: FacePick) {
  if (!opposite.length) return '이 면과 마주 보는 면이 없어요'
  if (text && opposite.every((o) => o.text)) return `면 ${text} ↔ 면 ${opposite.map((o) => o.text).join(', ')}: 서로 마주 보는 면이에요`
  return '연보라 두 면이 서로 마주 보는 면이에요'
}

// 책 장면 왼쪽 페이지 글 (viewer.md "책 장면"): 제목, 치수, 할 일 한 줄
function pageTextOf(scene: ShapeScene) {
  const size = scene.size as Partial<Record<'width' | 'depth' | 'height' | 'edge', number>>
  const dims = size.width ? `가로 ${size.width} · 세로 ${size.depth} · 높이 ${size.height}` : size.edge ? `한 모서리 ${size.edge}` : ''
  return [`${SHAPE_NAME[scene.shape]}의 전개도`, dims, '전개도를 접어 보며 어떤 모서리끼리 만나는지 찾아보세요.'].filter(Boolean)
}

// 화면 (docs/specs/ui.md 화면 배치): 3D 책 장면(stage) + 아래 바(dock: 안내·접기·선 긋기·보기) + 만들기 카드(사진·직접 만들기) + 챗봇.
// 넓은 화면은 stage 가 화면을 채우고 dock·카드가 그 위에 뜬다. 좁은 화면은 위 3D, 아래로 dock·카드
export default function App() {
  // 도형은 사진 인식(/analyze)이나 수동 입력으로만 생긴다. 그 전에는 null. 선 긋기로 lines 가 늘어난다
  const [scene, setScene] = useState<ShapeScene | null>(null)
  const [photo, setPhoto] = useState<string | null>(null) // 올린 학습지 사진. 전개도 그리기 칸 밑에 깔아 따라 그린다 (TODO-35)
  const [fit, setFit] = useState(NO_FIT) // 칸에 맞춘 사진 위치. 3D 책 페이지에도 같은 자리에 깐다 (TODO-36)
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
  const [facePick, setFacePick] = useState<FacePick | null>(null) // 마주 보는 면 보기: 누른 면
  const [marking, setMarking] = useState(false) // 면 표시 모드 (선 긋기와 함께 켜지지 않는다)
  const [mark, setMark] = useState<Mark>('◎')
  const canMark = scene?.net.layout === 'grid'
  // 한 번 그은 선이 선분 몇 개로 저장됐는지 (면에 걸친 선은 2~3개). 선 지우기는 그은 선 하나를 통째로 지운다
  const [strokes, setStrokes] = useState<number[]>([])
  // 방금 다른 면을 이은 선의 길 후보와 지금 그은 후보 번호. "다른 길"을 누르면 마지막 선을 다음 후보로 바꾼다
  const [route, setRoute] = useState<{ routes: Line<PolyhedronPoint>[][]; index: number } | null>(null)
  const steps = scene ? foldStepCount(scene) : 0
  const status = scene && foldStatus(scene.shape, unfold, playing, netCheck(scene)?.closed ?? true)

  // 새 도형(사진 인식 결과 등): 펼친 전개도에서 새로 시작한다
  const loadScene = (next: ShapeScene) => {
    setScene(next)
    setUnfold(1)
    setStrokes(next.lines.map(() => 1))
    setRoute(null)
    setHighlight([])
    setDrawState('idle')
  }

  // 안내 문구: 애니메이션 중에는 숨기고, 선 긋기 안내가 먼저다 (ui.md 친절한 설명 원칙, 안내 문구)
  const hint = !scene ? '학습지 사진을 올리거나 직접 만들어 보세요' : playing ? null : drawLines ? DRAW_HINT[drawState] : marking && canMark ? markHint(mark) : facePick ? facePickHint(facePick) : view.showMatchingEdges && steps > 0 ? '같은 색 모서리끼리 만나요. 면을 누르면 마주 보는 면을 알려 줘요' : null

  return (
    <div className="layout">
      <main className="stage">
        {scene && (
          <Viewer
            scene={scene}
            unfold={unfold}
            foldMode={foldMode}
            {...view}
            highlightVertices={highlight}
            drawLines={drawLines}
            edgeDivisions={edgeDivisions}
            pageText={pageTextOf(scene)}
            photo={photo && scene.net.layout === 'grid' ? netPhoto(photo, fit) : undefined}
            onSceneChange={(next) => {
              setStrokes([...strokes, next.lines.length - scene.lines.length])
              setScene(next)
            }}
            onDrawState={setDrawState}
            onRouteChoices={(routes) => setRoute(routes.length > 1 ? { routes, index: 0 } : null)}
            onFacePick={setFacePick}
            faceMarking={marking && canMark}
            onFaceMark={(i) => {
              if (scene.net.layout !== 'grid') return
              const faces = scene.net.faces.map((f, k) => (k === i ? markFace(f, mark) : f))
              setScene({ ...scene, net: { ...scene.net, faces } } as ShapeScene) // 펼침·선은 그대로
            }}
          />
        )}
        {status && (
          <div className={`status-badge${status.done ? ' done' : ''}${status.wrong ? ' wrong' : ''}`} role="status">
            {status.done && '✔ '}
            {status.wrong && '✖ '}
            {status.text}
          </div>
        )}
        {foldMode === 'step' && steps > 0 && <StepDots unfold={unfold} steps={steps} />}
      </main>
      <section className="dock" aria-label="접기">
        {hint && <p className="viewer-hint">{hint}</p>}
        {scene && (
          <>
            <FoldControls unfold={unfold} onChange={setUnfold} mode={foldMode} onModeChange={setFoldMode} steps={steps} onPlayingChange={setPlaying} target={foldTarget} />
            <div className="dock-row">
              <LineControls
                drawing={drawLines}
                onDrawingChange={(on) => {
                  setDrawLines(on)
                  setDrawState('idle')
                  if (on) setMarking(false)
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
              <FaceMarks
                on={marking && canMark}
                enabled={canMark || scene.lines.length === 0}
                onToggle={(on) => {
                  setMarking(on)
                  if (!on) return
                  setDrawLines(false)
                  if (!canMark) setScene(crossToGrid(scene)) // 십자형은 면 표시를 못 담아서 같은 모양의 grid 로 바꾼다
                }}
                mark={mark}
                onMark={setMark}
              />
              <details className="view-menu">
                <summary>보기</summary>
                <ViewOptions values={view} onChange={setView} />
              </details>
            </div>
          </>
        )}
      </section>
      <details className="make-card" open>
        <summary>
          <span className="brand">foldy</span> 도형 만들기
        </summary>
        <div className="make-body">
          <PhotoUpload
            onScene={(next, place) => {
              loadScene(next)
              // 네모로 읽은 전개도면 사진 위치를 그 네모에 맞춘다 (ui.md 화면 배치 2번)
              if (place && next.net.layout === 'grid') setFit(fitToBox(place.box, place.aspect, next.net.faces))
            }}
            onPhoto={(url) => {
              setPhoto(url)
              setFit(NO_FIT)
            }}
          />
          <ManualInput
            key={photo} // 새 사진이면 전개도 그리기로 열고 사진 위치를 처음부터
            photo={photo}
            scene={scene}
            fit={fit}
            onFit={setFit}
            onScene={(next, how) => {
              if (!next) return setScene(null)
              // 치수만 바꾸면 펼침·선을 그대로 두고, 전개도를 새로 그리면 펼친 상태에서 새로 시작한다
              if (how === 'size' && scene) return setScene(next)
              loadScene(next)
            }}
          />
        </div>
      </details>
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
