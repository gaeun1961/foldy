import { useEffect, useRef, useState } from 'react'
import type { ShapeScene } from '../shared/types'
import { chat } from './api'

// 챗봇 (docs/specs/ui.md 화면 배치 7번): 오른쪽 아래 동그란 아이콘을 누르면 대화창이 열린다.
// 넓은 화면은 아이콘 위 작은 창, 좁은 화면은 아래에서 올라오는 절반 높이 시트. 3D 뷰는 계속 보인다.
// 보낼 때 지금 도형을 같이 보낸다. 대화는 닫았다 열어도 남는다
interface Message {
  from: 'me' | 'bot' | 'error'
  text: string
}

export function ChatPanel({ scene }: { scene: ShapeScene | null }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, waiting, open])

  const send = async () => {
    const text = input.trim()
    if (!text || !scene || waiting) return
    setInput('')
    setMessages((m) => [...m, { from: 'me', text }])
    setWaiting(true)
    try {
      const reply = await chat(text, scene)
      setMessages((m) => [...m, { from: 'bot', text: reply }])
    } catch (e) {
      setMessages((m) => [...m, { from: 'error', text: (e as Error).message }])
    } finally {
      setWaiting(false)
    }
  }

  return (
    <>
      {open && (
        <section className="chat-panel" role="dialog" aria-label="도형 선생님과 대화">
          <header>
            <strong>도형 선생님</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="대화창 닫기">
              ✕
            </button>
          </header>
          <div className="chat-messages" ref={listRef} aria-live="polite">
            {!scene ? (
              <p className="chat-guide">사진을 올리거나 도형을 직접 고르면 물어볼 수 있어요</p>
            ) : (
              messages.length === 0 && <p className="chat-guide">도형에 대해 궁금한 것을 물어보세요. 정답 대신 힌트를 드려요</p>
            )}
            {messages.map((m, i) => (
              <p key={i} className={`chat-message ${m.from}`}>
                {m.text}
              </p>
            ))}
            {waiting && <p className="chat-message bot waiting">생각하는 중…</p>}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={scene ? '예: ㄱ이랑 만나는 꼭짓점은 어디야?' : '도형이 아직 없어요'}
              disabled={!scene}
              aria-label="질문"
            />
            <button type="submit" disabled={!scene || waiting || !input.trim()}>
              보내기
            </button>
          </form>
        </section>
      )}
      <button type="button" className="chat-fab" aria-label={open ? '대화창 닫기' : '챗봇에게 물어보기'} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? '✕' : '💬'}
      </button>
    </>
  )
}
