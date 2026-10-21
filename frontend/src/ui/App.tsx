import { useState } from 'react'
import { mockScene } from '../shared/mock'
import { Viewer } from '../viewer'
import { FoldControls } from './FoldControls'
import { foldStatus } from './foldStatus.ts'

// 화면 배치 자리만 잡아 둔 상태. TODO(UI): 업로드 → /analyze, 챗봇 → /chat 연결, 전체 디자인(TODO-14)
export default function App() {
  const scene = mockScene
  const [unfold, setUnfold] = useState(1) // 펼친 전개도에서 시작해서 "접기 ▶"로 접어 본다
  const status = foldStatus(scene.shape, unfold)

  return (
    <div className="layout">
      <header>foldy</header>
      <section className="upload">
        <h2>학습지 사진</h2>
        <p>사진 업로드 영역 (준비 중)</p>
      </section>
      <main className="viewer">
        <div className="viewer-canvas">
          <Viewer scene={scene} unfold={unfold} />
          <div className={`status-badge${status.done ? ' done' : ''}`} role="status">
            {status.done && '✔ '}
            {status.text}
          </div>
        </div>
        <FoldControls unfold={unfold} onChange={setUnfold} />
      </main>
      <aside className="chat">
        <h2>챗봇</h2>
        <p>챗봇 영역 (준비 중)</p>
      </aside>
    </div>
  )
}
