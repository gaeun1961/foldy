import { useState } from 'react'
import { mockScene } from '../shared/mock'
import { foldStepCount, Viewer, type Lesson } from '../viewer'
import { FoldControls, StepDots, type FoldMode } from './FoldControls'
import { foldStatus } from './foldStatus.ts'
import { LessonControls, LessonDots } from './LessonControls'
import { lessonStatus } from './lessonStatus.ts'
import { ViewOptions, type ViewOptionValues } from './ViewOptions'

// 화면 배치 자리만 잡아 둔 상태. TODO(UI): 업로드 → /analyze, 오른쪽 아래 동그란 챗봇 아이콘 → /chat (TODO-13), 전체 디자인(TODO-14)
export default function App() {
  const scene = mockScene
  const [unfold, setUnfold] = useState(1) // 펼친 전개도에서 시작해서 "접기 ▶"로 접어 본다
  const [foldMode, setFoldMode] = useState<FoldMode>('step') // 기본은 면을 하나씩 접기
  const [playing, setPlaying] = useState(false) // 접기 애니메이션 중이면 배지에서 숫자를 숨긴다
  const [view, setView] = useState<ViewOptionValues>({ showHiddenEdges: true, showVertexLabels: true, showMatchingEdges: true }) // 보기 옵션 체크박스, 기본값은 ui.md
  const [lesson, setLesson] = useState<Lesson | null>(null) // 설명 모드. 고르면 입체로 접고 접기 패널 대신 설명 조작을 보인다
  const steps = foldStepCount(scene)
  const status = lesson ? lessonStatus(lesson, playing) : foldStatus(scene.shape, unfold, playing)
  const changeLesson = (next: Lesson | null) => {
    if (next && !lesson) setUnfold(0) // 설명은 입체에서 본다
    setLesson(next)
  }

  return (
    <div className="layout">
      <header>foldy</header>
      <section className="upload">
        <h2>학습지 사진</h2>
        <p>사진 업로드 영역 (준비 중)</p>
      </section>
      <main className="viewer">
        <div className="viewer-canvas">
          <Viewer scene={scene} unfold={unfold} foldMode={foldMode} {...view} lesson={lesson} />
          <div className={`status-badge${status.done ? ' done' : ''}`} role="status">
            {status.done && '✔ '}
            {status.text}
          </div>
          {lesson ? <LessonDots scene={scene} lesson={lesson} /> : foldMode === 'step' && steps > 0 && <StepDots unfold={unfold} steps={steps} />}
          {/* 안내 문구: 애니메이션 중에는 숨긴다 (ui.md 친절한 설명 원칙) */}
          {!lesson && view.showMatchingEdges && steps > 0 && !playing && <p className="viewer-hint">같은 색 모서리끼리 만나요</p>}
          {lesson && lesson.progress <= 0 && !playing && <p className="viewer-hint">한 층씩 쌓아 볼까요</p>}
        </div>
        {!lesson && <FoldControls unfold={unfold} onChange={setUnfold} mode={foldMode} onModeChange={setFoldMode} steps={steps} onPlayingChange={setPlaying} />}
        <LessonControls scene={scene} lesson={lesson} onChange={changeLesson} onPlayingChange={setPlaying} />
        <ViewOptions values={view} onChange={setView} />
      </main>
    </div>
  )
}
