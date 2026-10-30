// backend 호출 (docs/specs/api.md). LLM 은 backend 만 부른다 (docs/specs/stack.md)
import type { ShapeScene } from '../shared/types'

export const API_URL = 'http://localhost:8000'

// 챗봇이 답과 함께 보내는 화면 조작 (api.md "/chat 화면 조작")
export interface ChatView {
  highlightVertices: number[] // 강조할 꼭짓점 인덱스. 빈 배열이면 강조 끔
  foldPercent: number | null // 접기 % (0 전개도 ~ 100 입체). null 이면 그대로
}
export interface ChatAnswer {
  reply: string
  view: ChatView | null
}

// 실패하면 backend 의 안내 문구(detail)를 담은 Error 를 던진다
export async function chat(message: string, scene: ShapeScene): Promise<ChatAnswer> {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, scene }),
  }).catch((e) => {
    console.error('backend 연결 실패', API_URL, e) // 개발자용. 학생에게는 아래 문구
    throw new Error('선생님과 연결이 안 됐어요. 잠시 뒤 다시 물어봐 주세요')
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof body.detail === 'string' ? body.detail : '답변을 가져오지 못했어요')
  return body
}

// 학습지 사진 → ShapeScene (api.md /analyze). 실패하면 backend 의 안내 문구(detail)를 담은 Error 를 던진다
export async function analyze(photo: File): Promise<ShapeScene> {
  const form = new FormData()
  form.append('file', photo)
  const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form }).catch((e) => {
    console.error('backend 연결 실패', API_URL, e) // 개발자용. 학생에게는 아래 문구
    throw new Error('사진을 보내지 못했어요. 잠시 뒤 다시 올려 주세요')
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof body.detail === 'string' ? body.detail : '사진에서 도형을 찾지 못했어요')
  return body
}
