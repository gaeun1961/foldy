import { mockScene } from '../shared/mock'
import { Viewer } from '../viewer'

// 화면 배치 자리만 잡아 둔 상태. TODO(UI): 업로드 → /analyze, 챗봇 → /chat 연결
export default function App() {
  return (
    <div className="layout">
      <header>foldy</header>
      <section className="upload">
        <h2>학습지 사진</h2>
        <p>사진 업로드 영역 (준비 중)</p>
      </section>
      <main className="viewer">
        <Viewer scene={mockScene} />
      </main>
      <aside className="chat">
        <h2>챗봇</h2>
        <p>챗봇 영역 (준비 중)</p>
      </aside>
    </div>
  )
}
