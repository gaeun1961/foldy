import { useEffect, useMemo, useRef, useState } from 'react'
import { PerfMeter } from './PerfMeter'
import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types'
import { CONE_THIRD_LINK, EmptyBook, foldStepCount, LESSON_LABEL, LESSON_POSE, lessonGrade, lessonHint, lessonNote, lessonStepCount, lessonSummary, lessonTabs, NET_VARIANTS, netCheck, netVariant, hologramSupported, Viewer, type DrawState, type FacePick, type Lesson, type LessonKind, type PageMenuItem, type PiMode } from '../viewer'
import { FoldControls, StepDots, type FoldMode } from './FoldControls'
import { HologramMode } from './HologramMode'
import { foldStatus, polygonName, shapeName, unfoldOf } from './foldStatus.ts'
import { ChatPanel } from './ChatPanel'
import { DragHandle } from './DragHandle'
import { FaceMarks } from './FaceMarks'
import { markFace, markHint, type Mark } from './markFace.ts'
import { LessonControls, LessonDots } from './LessonControls'
import { lessonStatus } from './lessonStatus.ts'
import { LineControls } from './LineControls'
import { ManualInput } from './ManualInput'
import { crossScene, crossToGrid, fitToBox, netPhoto, NO_FIT, SHAPES } from './manualScene.ts'
import { PhotoUpload, type PhotoPlace } from './PhotoUpload'
import { ShapeTabs } from './ShapeTabs'
import { ViewMenu } from './ViewMenu'
import { SPEEDS, type Speed } from './player'
import type { ViewOptionValues } from './ViewOptions'

const OPENING_SEEN = 'foldy-opening-seen' // 이 탭에서 오프닝을 봤으면 sessionStorage 에 남긴다 (새로고침은 그대로, 탭을 닫으면 지워진다)

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

// 도형이 없을 때 빈 책 (ui.md 안내 문구 "도형 없음", viewer.md "빈 책"): 왼쪽 쪽 사용법, 오른쪽 쪽 차례.
// 지금 고를 수 있는 것은 치수로 만들기의 도형(SHAPES)이고, 나머지는 나중에 넣을 도형 (2·3차).
// 쪽 번호: 차례는 2·3쪽, 차례 k번째 도형은 (2k+4)·(2k+5)쪽 (k 는 0부터)
const INTRO = ['foldy', '전개도를 접어 보는 책이에요. 오른쪽 차례에서 도형을 골라 보세요.']
const CONTENTS = SHAPES.map((s, k) => ({ title: s.name, page: 2 * k + 4 }))
const CONTENTS_PAGES: [number, number] = [2, 3]
function pageNumbersOf(scene: ShapeScene): [number, number] | undefined {
  const k = SHAPES.findIndex((s) => s.shape === scene.shape)
  return k < 0 ? undefined : [2 * k + 4, 2 * k + 5]
}

// 책 장면 왼쪽 페이지 글 (ui.md 공식 시각화 규칙): 제목과 한 줄 설명. 설명은 멈췄을 때의 공식 설명, 없으면 치수. 결과가 나오면 치수는 뺀다
function pageTextOf(scene: ShapeScene, lesson: Lesson | null, explain: string | null, hasResult: boolean) {
  const note = lesson && lessonNote(lesson, scene) // 앞에서 피타고라스로 구한 값은 계속 남긴다
  const size = scene.size as Partial<Record<'width' | 'depth' | 'height' | 'edge' | 'sides' | 'radius', number>>
  const dims = scene.shape === 'revolution'
    ? ''
    : size.radius
    ? `반지름 ${size.radius}${size.height ? ` · 높이 ${size.height}` : ''}`
    : size.width
    ? `가로 ${size.width} · 세로 ${size.depth} · 높이 ${size.height}`
    : size.sides
      ? `밑면 ${polygonName(size.sides)} · 한 변 ${size.edge} · 높이 ${size.height}`
      : size.edge
        ? `한 모서리 ${size.edge}`
        : ''
  const title = scene.shape === 'revolution' ? (lesson && lesson.kind !== 'revolve' ? `회전체의 ${LESSON_LABEL[lesson.kind]}` : '회전체') : lesson ? `${shapeName(scene)}의 ${LESSON_LABEL[lesson.kind]}` : scene.shape === 'sphere' ? shapeName(scene) : `${shapeName(scene)}의 전개도`
  if (note) return [title, note, ...(explain && explain !== note ? [explain] : [])]
  if (explain) return [title, explain]
  // 사진에서 읽은 문제 문장은 제목 아래에 (shape-scene.md problem, worksheets.md W7)
  return hasResult ? [title] : [title, shortProblem(scene.problem), dims].filter(Boolean)
}

// 책 왼쪽 쪽에 쓰는 문제 글은 두 줄까지 (길면 아래 메뉴가 페이지 밖으로 밀린다). 전체는 만들기 카드의 인식 결과 아래에 있다
const PROBLEM_ON_PAGE = 46
function shortProblem(problem: string | null | undefined) {
  if (!problem) return ''
  return problem.length <= PROBLEM_ON_PAGE ? problem : `${problem.slice(0, PROBLEM_ON_PAGE - 1).trimEnd()}…`
}

// 다른 전개도 보기 (ui.md 화면 배치 6번, TODO-38): 같은 치수로 k번째 정육면체 전개도 모양의 grid. 선은 꼭짓점 번호가 달라져서 옮기지 않는다
function variantScene(scene: ShapeScene, k: number): ShapeScene {
  const s = scene.size as Partial<Record<'width' | 'depth' | 'height' | 'edge', number>>
  const dims: [number, number, number] = s.edge ? [s.edge, s.edge, s.edge] : [s.width!, s.depth!, s.height!]
  return { ...scene, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'grid', faces: netVariant(k, dims) } } as ShapeScene
}

// 도형을 처음 열 때의 설명: 회전체는 돌리기가 메인이라 처음부터 돌리기 화면
const firstLesson = (scene: ShapeScene): Lesson | null => (scene.shape === 'revolution' ? { kind: 'revolve', progress: 0 } : null)

// 화면 (docs/specs/ui.md 화면 배치): 3D 책 장면(stage) + 아래 바(dock: 안내·접기·선 긋기·보기) + 만들기 카드(사진·직접 만들기) + 챗봇.
// 넓은 화면은 stage 가 화면을 채우고 dock·카드가 그 위에 뜬다. 좁은 화면은 위 3D, 아래로 dock·카드
const PERF = new URLSearchParams(location.search).has('perf') // 실측용 계측기 (PerfMeter, #142)

export default function App() {
  // 도형은 사진 인식(/analyze)이나 수동 입력으로만 생긴다. 그 전에는 null. 선 긋기로 lines 가 늘어난다
  const [scene, setScene] = useState<ShapeScene | null>(null)
  // 오프닝은 앱을 열 때 한 번만 (ui.md "오프닝"). 주소에 ?opening 을 붙이면 다시 본다(시연용). 움직임 줄이기 설정이면 보이지 않는다
  const [opening, setOpening] = useState(() => new URLSearchParams(location.search).has('opening') || (!sessionStorage.getItem(OPENING_SEEN) && !matchMedia('(prefers-reduced-motion: reduce)').matches))
  const endOpening = () => {
    sessionStorage.setItem(OPENING_SEEN, '1')
    setOpening(false)
  }
  const [hologram, setHologram] = useState(false) // 홀로그램 보기 (ui.md "홀로그램 보기"). 켜져 있는 동안 책 장면은 그리지 않는다
  const [reading, setReading] = useState(false) // 사진을 읽는 중 (PhotoUpload onReading)
  // 여러 도형 문제 (worksheets.md 여러 도형): 읽은 도형들과 지금 접는 것. 고른 하나만 책에서 접고 홀로그램에도 그것만
  const [gallery, setGallery] = useState<{ scene: ShapeScene; place: PhotoPlace | null }[] | null>(null)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [drawIn, setDrawIn] = useState(0) // 사진 인식 결과가 올 때마다 1 늘린다. 책에 펜이 그려 낸다 (viewer.md "펜으로 그려 내기")
  const [photo, setPhoto] = useState<string | null>(null) // 올린 학습지 사진. 전개도 그리기 칸 밑에 깔아 따라 그린다 (TODO-35)
  const readingNow = reading && !!photo && !hologram // 읽는 동안 3D 는 사진 깐 빈 책
  // 사진이 있으면 직접 만들기를 접어 둔다. 고치기를 누르거나 인식이 실패하면 그 사진에서만 펼친다 (worksheets.md, 수동 경로는 늘 한 번에 닿는다)
  const [manualFor, setManualFor] = useState<string | null>(null)
  const manualOpen = !photo || manualFor === photo
  const [fit, setFit] = useState(NO_FIT) // 칸에 맞춘 사진 위치. 3D 책 페이지에도 같은 자리에 깐다 (TODO-36)
  const [unfold, setUnfold] = useState(1) // 펼친 전개도에서 시작해서 "접기 ▶"로 접어 본다
  const [foldMode, setFoldMode] = useState<FoldMode>('step') // 기본은 면을 하나씩 접기
  const [playing, setPlaying] = useState(false) // 접기 애니메이션 중이면 배지에서 숫자를 숨긴다
  const [speed, setSpeed] = useState<Speed>('normal')
  const [piMode, setPiMode] = useState<PiMode>('pi') // 공식과 원이 들어간 값: 기본 중등(문자 공식, π), 아래 바에서 초등(말 공식, 3.14)
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
  const sphere = scene?.shape === 'sphere' // 전개도가 없어서 접기 패널이 없다
  const revolution = scene?.shape === 'revolution' // 돌리는 것이 메인이라 접기 패널이 없다
  const noFold = sphere || revolution
  const curved = scene?.shape === 'cylinder' || scene?.shape === 'cone' || noFold // 곡면 도형에는 선을 긋지 않는다
  // 한 번 그은 선이 선분 몇 개로 저장됐는지 (면에 걸친 선은 2~3개). 선 지우기는 그은 선 하나를 통째로 지운다
  const [strokes, setStrokes] = useState<number[]>([])
  // 방금 다른 면을 이은 선의 길 후보와 지금 그은 후보 번호. "다른 길"을 누르면 마지막 선을 다음 후보로 바꾼다
  const [route, setRoute] = useState<{ routes: Line<PolyhedronPoint>[][]; index: number } | null>(null)
  // 지금 전개도가 정육면체 전개도 11가지 중 몇 번째인지 (십자형은 0, 그리기 칸에서 고쳤거나 학습지 전개도면 null)
  const [variant, setVariant] = useState<number | null>(null)
  const [dockOffset, setDockOffset] = useState({ x: 0, y: 0 }) // 손잡이로 옮긴 아래 바 위치 (넓은 화면)
  const [lesson, setLesson] = useState<Lesson | null>(null) // 설명 모드. 고르면 그 설명의 자세(입체/전개도)로 두고 접기 패널 대신 설명 조작을 보인다
  const steps = scene ? foldStepCount(scene) : 0
  const status = scene && (lesson ? lessonStatus(lesson, playing) : foldStatus(scene.shape, unfold, playing, netCheck(scene)?.closed ?? true, shapeName(scene)))
  // 공식 결과: 애니메이션이 끝나고 멈춘 뒤에만 (ui.md 친절한 설명 원칙), 왼쪽 쪽에
  const result = scene && lesson && lesson.progress >= 1 && !playing ? lessonSummary(scene, lesson.kind, lesson.scale, piMode, lesson.cut) : null
  // 결과는 한 줄씩: 일반 공식 → 숫자 식 → 답
  const resultKey = result ? JSON.stringify(result) : ''
  // 설명 줄이 있는 결과(구 단면 비교)는 슬라이더가 멈춘 뒤에 첫 줄부터. 값이 바뀌면 타이머를 지워서 움직이는 동안은 글이 없다
  const stepped = result?.lines?.length ?? 0
  const [revealed, setRevealed] = useState({ key: '', lines: 1 })
  const reveal = revealed.key === resultKey ? revealed.lines : stepped ? 0 : 1
  useEffect(() => {
    if (!resultKey) return
    const lines = stepped ? [...Array(stepped).keys()].map((k) => k + 1) : [2, 3] // 일반 공식 또는 닮음비 다음 두 줄
    const timers = lines.map((n, k) => setTimeout(() => setRevealed({ key: resultKey, lines: n }), (k + 1) * 800))
    return () => timers.forEach(clearTimeout)
  }, [resultKey, stepped])
  const viewerLesson = useMemo(() => (lesson ? { ...lesson, pi: piMode } : null), [lesson, piMode])
  const explain = scene && viewerLesson ? lessonHint(viewerLesson, scene) : null // 공식 설명은 왼쪽 쪽에만 (멈췄을 때)
  const makeCard = useRef<HTMLDetailsElement>(null)
  const canVariant = scene?.net.layout === 'cross' || scene?.net.layout === 'grid'
  // 책 왼쪽 쪽 메뉴 (ui.md 왼쪽 페이지): 이 도형에 있는 공식 + 다른 전개도 보기
  const pageMenu: PageMenuItem[] = !scene
    ? []
    : [
        ...lessonTabs(scene)
          .filter((k) => lessonStepCount(scene, k) > 0)
          .map((k) => ({ id: k as string, label: LESSON_LABEL[k], active: lesson?.kind === k, enabled: true })),
        ...(canVariant
          ? [{ id: 'variant', label: `다른 전개도 보기${variant !== null ? ` (${variant + 1}/${NET_VARIANTS.length})` : ''}`, active: false, enabled: !lesson && unfold >= 1 && scene.lines.length === 0 }]
          : []),
      ]
  const pickMenu = (id: string) => {
    if (!scene) return
    // 구 단면 비교의 "⅓ 왜?": 같은 반지름·높이의 원뿔 부피 끝(원판 쌓기)으로
    if (id === CONE_THIRD_LINK && scene.shape === 'sphere') {
      loadScene(crossScene('cone', { radius: scene.size.radius, height: scene.size.radius }))
      setGallery(null)
      setUnfold(0)
      setLesson({ kind: 'volume', progress: 1 })
      return
    }
    if (id === 'variant') {
      // 같은 치수로 다음 모양을 펼친다. grid 라서 전개도 그리기 칸에도 채워진다
      const k = variant === null ? 0 : (variant + 1) % NET_VARIANTS.length
      loadScene(variantScene(scene, k))
      setGallery(null)
      setFacePick(null)
      setVariant(k)
      return
    }
    // 회전체 겉넓이·부피는 움직임이 없어서 바로 결과를 쓴다
    changeLesson(lesson?.kind === id ? null : { kind: id as LessonKind, progress: id === 'revolve-area' || id === 'revolve-volume' ? 1 : 0 })
  }
  const changeLesson = (next: Lesson | null) => {
    if (next && !lesson && makeCard.current) makeCard.current.open = false // 공식 결과가 나오는 왼쪽 쪽을 가리지 않게 접는다 (제목 줄을 누르면 다시 펼침)
    if (next && next.kind !== lesson?.kind) setUnfold(LESSON_POSE[next.kind] === 'net' ? 1 : 0)
    setLesson(next)
  }

  // 새 도형(사진 인식 결과 등): 펼친 전개도에서 새로 시작한다
  // 사진에서 읽은 도형 하나를 책에 (여러 도형이면 고른 것). 네모로 읽은 전개도면 사진 위치를 그 네모에 맞춘다 (ui.md 화면 배치 2번)
  // draw: 펜이 그려 낼지. 결과가 처음 올 때 한 번만 (여러 도형이면 모두 같이). 고른 도형만 바꿀 때는 그리지 않는다
  const showShape = (next: ShapeScene, place: PhotoPlace | null, draw = true) => {
    loadScene(next)
    if (draw) setDrawIn((n) => n + 1)
    if (place && next.net.layout === 'grid') setFit(fitToBox(place.box, place.aspect, next.net.faces))
  }

  // 사진 인식 결과 (도형 하나 또는 여러 개). 읽기 시작 뒤 학생이 도형을 바꿨으면(직접 그리기 안내 뒤 등) 덮지 않고 단추로 묻는다
  type Found = { scene: ShapeScene; place: PhotoPlace | null }[]
  const [pendingResult, setPendingResult] = useState<Found | null>(null)
  // 읽기를 시작할 때의 도형과 지금 도형. 결과 콜백은 "읽기"를 누른 때의 것이라 지금 도형은 ref 로 본다
  const readStart = useRef<{ scene: ShapeScene | null } | null>(null)
  const sceneNow = useRef(scene)
  useEffect(() => {
    sceneNow.current = scene
  }, [scene])
  useEffect(() => {
    if (reading) readStart.current = { scene: sceneNow.current }
  }, [reading])
  const show = (list: Found) => {
    setPendingResult(null)
    setGallery(list.length > 1 ? list : null)
    setGalleryIndex(0)
    showShape(list[0].scene, list[0].place)
  }
  const arrive = (list: Found) => {
    const changed = readStart.current !== null && readStart.current.scene !== sceneNow.current
    readStart.current = null
    if (changed) setPendingResult(list)
    else show(list)
  }

  // 여러 도형에서 접을 것 고르기 (아래 바 ①②…, 책에서 누르기)
  const pickShape = (i: number) => {
    if (!gallery?.[i] || i === galleryIndex) return
    setGalleryIndex(i)
    showShape(gallery[i].scene, gallery[i].place, false)
  }

  const loadScene = (next: ShapeScene) => {
    setScene(next)
    setUnfold(1)
    setStrokes(next.lines.map(() => 1))
    setRoute(null)
    setHighlight([])
    setDrawState('idle')
    setLesson(firstLesson(next))
    setVariant(next.net.layout === 'cross' ? 0 : null)
  }

  // 안내 문구: 애니메이션 중에는 숨기고, 선 긋기 안내가 먼저다 (ui.md 친절한 설명 원칙, 안내 문구)
  const hint = !scene ? '학습지 사진을 올리거나 직접 만들어 보세요' : playing || lesson ? null : revolution ? '왼쪽 쪽에서 회전체를 골라 돌려 보세요' : sphere ? '왼쪽 쪽에서 겉넓이나 부피를 골라 보세요' : drawLines ? DRAW_HINT[drawState] : marking && canMark ? markHint(mark) : facePick ? facePickHint(facePick) : curved && view.showMatchingEdges ? '같은 색 선끼리 만나요' : view.showMatchingEdges && steps > 0 ? '같은 색 모서리끼리 만나요. 면을 누르면 마주 보는 면을 알려 줘요' : null

  return (
    <div className={`layout${opening ? ' opening' : ''}`}>
      <main className="stage">
        {opening && (
          <button type="button" className="secondary-button skip-opening" onClick={endOpening}>
            건너뛰기
          </button>
        )}
        {/* 사진을 읽는 동안은 빈 책 오른쪽 쪽에 사진을 깔고 펜이 칠한다 (ui.md 화면 배치 2번, viewer.md "빈 책" 읽는 중) */}
        {readingNow && <EmptyBook pageText={[]} contents={[]} reading={photo!} onPick={() => {}} />}
        {!scene && !readingNow && <EmptyBook pageText={INTRO} contents={CONTENTS} pageNumbers={CONTENTS_PAGES} opening={opening} onOpened={endOpening} onPick={(k) => {
              loadScene(crossScene(SHAPES[k].shape, { ...SHAPES[k].size }))
              // 왼쪽 쪽 메뉴를 가리지 않게 접는다. 각기둥·각뿔·회전체는 밑면 모양, 평면도형을 카드에서 고르는 것을 바로 알게 펼쳐 둔다
              if (makeCard.current) makeCard.current.open = 'sides' in SHAPES[k].size || 'figure' in SHAPES[k].size
            }} />}
        {scene && !hologram && !readingNow && (
          <Viewer
            scene={scene}
            unfold={unfold}
            foldMode={foldMode}
            {...view}
            highlightVertices={highlight}
            lesson={viewerLesson}
            drawLines={drawLines}
            edgeDivisions={edgeDivisions}
            pageText={pageTextOf(scene, lesson, explain, !!result)}
            pageResult={result ? { ...result, reveal } : undefined}
            pageMenu={pageMenu}
            onPageMenu={pickMenu}
            pageNumbers={pageNumbersOf(scene)}
            photo={photo && scene.net.layout === 'grid' ? netPhoto(photo, fit) : undefined}
            drawIn={drawIn || undefined}
            gallery={gallery && gallery.length > 1 ? gallery.map((g) => g.scene) : undefined}
            galleryIndex={galleryIndex}
            onPickGallery={pickShape}
            onSceneChange={(next) => {
              setStrokes([...strokes, next.lines.length - scene.lines.length])
              setScene(next)
              // 여러 도형이면 그은 선·면 표시를 목록에도 써 둔다 (다른 도형을 골랐다 돌아와도 남게)
              setGallery((g) => g && g.map((x, i) => (i === galleryIndex ? { ...x, scene: next } : x)))
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
            {scene && lesson && lessonGrade(lesson, scene) && <small className="status-grade">{lessonGrade(lesson, scene)}</small>}
          </div>
        )}
        {scene && lesson ? <LessonDots scene={scene} lesson={lesson} /> : foldMode === 'step' && steps > 0 && <StepDots unfold={unfold} steps={steps} />}
      </main>
      <section className="dock" aria-label="접기" style={{ translate: `${dockOffset.x}px ${dockOffset.y}px` }}>
        <DragHandle offset={dockOffset} onMove={setDockOffset} />
        {/* 왼쪽 쪽 메뉴는 3D 책에 그려서 키보드·화면 낭독기로 못 고른다. 같은 메뉴를 눈에 안 보이는 버튼으로 둔다 */}
        <div className="visually-hidden" role="group" aria-label="공식과 전개도 메뉴">
          {pageMenu.map((m) => (
            <button key={m.id} type="button" data-page-menu={m.id} aria-pressed={m.active} disabled={!m.enabled} onClick={() => pickMenu(m.id)}>
              {m.label}
            </button>
          ))}
          {result?.lines && reveal >= 5 && (
            <button type="button" data-page-menu={CONE_THIRD_LINK} onClick={() => pickMenu(CONE_THIRD_LINK)}>
              원뿔이 원기둥의 ⅓인 이유 보기
            </button>
          )}
        </div>
        {hint && <p className="viewer-hint">{hint}</p>}
        {scene && (
          <>
            {gallery && gallery.length > 1 && (
              <ShapeTabs
                scenes={gallery.map((g) => g.scene)}
                index={galleryIndex}
                onPick={pickShape}
              />
            )}
            <LessonControls scene={scene} lesson={lesson} onChange={changeLesson} onPlayingChange={setPlaying} speed={speed} />
            {!lesson && !noFold && <FoldControls unfold={unfold} onChange={setUnfold} mode={foldMode} speed={speed} steps={steps} onPlayingChange={setPlaying} target={foldTarget} />}
            <div className="dock-row">
              {!lesson && !curved && (
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
              )}
              {/* 면 표시: 직육면체·정육면체만. 선 긋기와 같은 모양, 같은 줄 */}
              {!lesson && (scene.shape === 'cuboid' || scene.shape === 'cube') && (
                <div className="line-controls">
                  <button
                    type="button"
                    className="toggle-button"
                    aria-pressed={marking && canMark}
                    disabled={!(canMark || (scene.net.layout === 'cross' && scene.lines.length === 0))}
                    title={canMark || scene.lines.length === 0 ? undefined : '선을 지운 뒤에 쓸 수 있어요'}
                    onClick={() => {
                      const on = !(marking && canMark)
                      setMarking(on)
                      if (!on) return
                      setDrawLines(false)
                      if (!canMark) setScene(crossToGrid(scene)) // 십자형은 면 표시를 못 담아서 같은 모양의 grid 로 바꾼다
                    }}
                  >
                    면 표시
                  </button>
                </div>
              )}
              {/* 빠르기와 과정 (ui.md 화면 배치): 보기·차례 왼쪽에 바로. 과정은 공식을 볼 때만. 구에는 심화가 있어 언제나 (셋 중 하나만 눌린다, 심화는 중등 내용) */}
              <div className="toggle-row" role="group" aria-label="빠르기">
                {(Object.keys(SPEEDS) as Speed[]).map((s) => (
                  <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                    {SPEEDS[s].label}
                  </button>
                ))}
              </div>
              {(lesson || sphere) && !revolution && (
                <div className="toggle-row" role="group" aria-label="과정">
                  {(['3.14', 'pi'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={lesson?.kind !== 'sphere-section' && piMode === m}
                      onClick={() => {
                        setPiMode(m)
                        if (lesson?.kind === 'sphere-section') changeLesson({ kind: 'volume', progress: 0 })
                      }}
                    >
                      {m === 'pi' ? '중등' : '초등'}
                    </button>
                  ))}
                  {sphere && (
                    <button
                      type="button"
                      aria-pressed={lesson?.kind === 'sphere-section'}
                      onClick={() => changeLesson(lesson?.kind === 'sphere-section' ? { kind: 'volume', progress: 0 } : { kind: 'sphere-section', progress: 0, cut: 0.5 })}
                    >
                      심화
                    </button>
                  )}
                </div>
              )}
              <ViewMenu
                lessonOn={!!lesson || noFold} // 구·회전체에는 면 표시와 모서리 보기 옵션이 필요 없다
                steps={steps}
                mode={foldMode}
                onModeChange={setFoldMode}
                values={view}
                onValues={setView}
              />
              <button
                type="button"
                className="contents-button"
                onClick={() => {
                  // 차례로: 도형을 내리고 빈 책으로 (사진·사진 위치는 그대로, ui.md 화면 배치 6번)
                  setScene(null)
                  setGallery(null)
                  setLesson(null)
                  setMarking(false)
                  setDrawLines(false)
                  setFacePick(null)
                }}
              >
                차례
              </button>
              {/* 홀로그램으로 접을 입체가 없으면(면이 하나뿐인 학습지 등) 버튼은 보이되 꺼진다 */}
              <button
                type="button"
                className="contents-button"
                disabled={!hologramSupported(scene)}
                title={hologramSupported(scene) ? undefined : '접을 입체가 없어서 홀로그램으로 볼 수 없어요'}
                onClick={() => setHologram(true)}
              >
                홀로그램
              </button>
              {!lesson && marking && canMark && <FaceMarks mark={mark} onMark={setMark} />}
            </div>
          </>
        )}
      </section>
      <details className="make-card" open ref={makeCard}>
        <summary>
          <span className="brand">foldy</span> 도형 만들기
        </summary>
        <div className="make-body">
          <PhotoUpload
            onScene={(next, place) => arrive([{ scene: next, place }])}
            onShapes={arrive}
            onPhoto={(url) => {
              setPhoto(url)
              setFit(NO_FIT)
              setGallery(null)
              setPendingResult(null)
              setScene(null) // 새 사진이면 이전 도형을 내린다 (이전 전개도 밑에 새 사진이 어긋나 깔리지 않게, 코드 검토)
            }}
            onManual={() => setManualFor(photo)}
            onReading={setReading}
          />
          {pendingResult && (
            // 읽는 동안 학생이 직접 도형을 바꿨으면 결과로 덮지 않고 묻는다 (코드 검토)
            <button type="button" className="primary-button" style={{ width: '100%' }} onClick={() => show(pendingResult)}>
              인식한 도형으로 바꾸기
            </button>
          )}
          {!manualOpen && (
            <button type="button" className="secondary-button" style={{ width: '100%' }} onClick={() => setManualFor(photo)}>
              인식이 틀렸나요? 직접 고치기 ▸
            </button>
          )}
          {manualOpen && (
            <ManualInput
              key={photo} // 새 사진이면 전개도 그리기로 열고 사진 위치를 처음부터
              photo={photo}
              scene={scene}
              fit={fit}
              onFit={setFit}
              onScene={(next, how) => {
                setGallery(null) // 직접 만든 도형은 여러 도형 문제와 따로 (코드 검토)
                if (!next) return setScene(null)
                // 치수만 바꾸면 펼침·선을 그대로 두고, 전개도를 새로 그리면 펼친 상태에서 새로 시작한다
                if (how === 'size' && scene) {
                  if (next.net.layout !== scene.net.layout) setVariant(next.net.layout === 'cross' ? 0 : null)
                  // 도형을 바꾸면 공식 설명을 끈다. 켜 둔 공식이 없는 도형(정다면체 등)에서는 조작 버튼이 모두 사라진다
                  if (next.shape !== scene.shape) {
                    setLesson(firstLesson(next))
                    setUnfold(1)
                  } else if (lesson && lessonStepCount(next, lesson.kind) === 0) setLesson(firstLesson(next)) // 치수를 바꿨더니 보던 탭이 없어진 때 (떨어진 반원의 부피)
                  return setScene(next)
                }
                loadScene(next)
              }}
            />
          )}
        </div>
      </details>
      {PERF && <PerfMeter reading={reading} />}
      {hologram && scene && <HologramMode scene={scene} photo={photo && scene.net.layout === 'grid' ? netPhoto(photo, fit) : undefined} onClose={() => setHologram(false)} />}
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
