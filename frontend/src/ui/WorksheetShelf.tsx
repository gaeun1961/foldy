import { useEffect, useRef, useState } from 'react'
import type { WorksheetItem } from './worksheetStore'

// 내 학습지 목록 (docs/specs/worksheets.md W3, ui.md 화면 배치 2번): 썸네일 + 이름 + 날짜. 누르면 열고, ⋯로 이름 바꾸기·지우기
interface Props {
  items: WorksheetItem[]
  disabled: boolean
  onOpen: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function Thumb({ blob }: { blob: Blob }) {
  // 주소는 effect 안에서 만들고 지운다 (useMemo 로 만들면 개발 모드 StrictMode 가 effect 를 두 번 돌려 지운 주소를 쓴다)
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (img.current) img.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return <img ref={img} alt="" />
}

export function WorksheetShelf({ items, disabled, onOpen, onRename, onDelete }: Props) {
  const [menu, setMenu] = useState<string | null>(null) // ⋯ 를 연 학습지
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [asking, setAsking] = useState<string | null>(null) // 지울지 묻는 중
  if (!items.length) return null
  return (
    <details className="shelf">
      <summary>내 학습지 ({items.length})</summary>
      <ul>
        {items.map((w) => (
          <li key={w.id}>
            {editing?.id === w.id ? (
              <form
                className="shelf-rename"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (editing.name.trim()) onRename(w.id, editing.name.trim())
                  setEditing(null)
                }}
              >
                <input value={editing.name} maxLength={40} autoFocus aria-label="학습지 이름" onChange={(e) => setEditing({ id: w.id, name: e.target.value })} />
                <button type="submit" className="secondary-button">
                  저장
                </button>
              </form>
            ) : (
              <button type="button" className="shelf-open" disabled={disabled} onClick={() => onOpen(w.id)}>
                <Thumb blob={w.thumb} />
                <span>
                  <strong>{w.name}</strong>
                  {w.scene.problem && <small>{w.scene.problem}</small>}
                </span>
              </button>
            )}
            <button type="button" className="shelf-more" aria-label={`${w.name} 더 보기`} aria-expanded={menu === w.id} onClick={() => setMenu(menu === w.id ? null : w.id)}>
              ⋯
            </button>
            {menu === w.id && (
              <div className="shelf-menu">
                {asking === w.id ? (
                  <>
                    <span>이 학습지를 지울까요?</span>
                    <button
                      type="button"
                      className="secondary-button danger"
                      onClick={() => {
                        onDelete(w.id)
                        setAsking(null)
                        setMenu(null)
                      }}
                    >
                      지우기
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setAsking(null)}>
                      그만두기
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setEditing({ id: w.id, name: w.name })
                        setMenu(null)
                      }}
                    >
                      이름 바꾸기
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setAsking(w.id)}>
                      지우기
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
