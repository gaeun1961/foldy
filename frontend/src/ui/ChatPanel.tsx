import { useEffect, useRef, useState } from 'react'
import { useOperation } from './activity'
import type { ShapeScene } from '../shared/types'
import { chat, type ChatView, OfflineError } from './api'

// 챗봇 (docs/specs/ui.md 화면 배치 7번): 오른쪽 아래 동그란 아이콘을 누르면 대화창이 열린다.
// 넓은 화면은 아이콘 위 작은 창, 좁은 화면은 아래에서 올라오는 절반 높이 시트. 3D 뷰는 계속 보인다.
// 보낼 때 지금 도형을 같이 보낸다. 대화는 닫았다 열어도 남는다.
// 답과 함께 온 화면 조작(view)은 onView 로 넘긴다. 다음 답이 오면 그 답의 값으로 바뀌고, 창을 닫으면 강조를 끈다 (api.md)
interface Message {
  from: 'me' | 'bot' | 'error'
  text: string
}

const CLEAR: ChatView = { highlightVertices: [], foldPercent: null }

export function ChatPanel({ scene, onView }: { scene: ShapeScene | null; onView: (view: ChatView) => void }) {
  const { begin } = useOperation()
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, waiting, open])

  const close = () => {
    setOpen(false)
    onView(CLEAR)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || !scene || waiting || request.current) return
    const controller = new AbortController()
    request.current = controller
    const done = begin({ label: '취소', run: () => {
      controller.abort()
      request.current = null
      setWaiting(false)
      done()
    } })
    setInput('')
    setMessages((m) => [...m, { from: 'me', text }])
    setWaiting(true)
    try {
      const { reply, view } = await chat(text, scene, controller.signal)
      if (controller.signal.aborted || request.current !== controller) return
      setMessages((m) => [...m, { from: 'bot', text: reply }])
      onView(view ?? CLEAR)
    } catch (e) {
      if (controller.signal.aborted || request.current !== controller) return
      setMessages((m) => [...m, { from: e instanceof OfflineError ? 'bot' : 'error', text: (e as Error).message }])
    } finally {
      if (request.current === controller) { request.current = null; setWaiting(false) }
      done()
    }
  }

  return (
    <>
      {open && (
        <section className="chat-panel" role="dialog" aria-label="도형 선생님과 대화">
          <header>
            <strong>도형 선생님</strong>
            <button type="button" onClick={close} aria-label="대화창 닫기">
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
      <button type="button" className="chat-fab" aria-label={open ? '대화창 닫기' : '챗봇에게 물어보기'} aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        {open ? (
          '✕'
        ) : (
          // 말풍선 아이콘 (이모지 대신 선 그림)
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h16v11H9l-5 4z" />
          </svg>
        )}
      </button>
    </>
  )
}
