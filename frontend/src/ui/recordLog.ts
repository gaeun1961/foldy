// 사진 인식 기록 모드 — frontend (docs/specs/worksheets.md H, #160). backend VISION_RECORD=1 과 짝.
// 개발 빌드나 VITE_RECORD=1 로 만든 빌드(휴대폰 실측)에서만 켜진다. 배포 빌드에서는 RECORD 가 false 라 아래 코드가 빠진다.
// 사진 하나(기준 사진)마다 묶음 id 를 두고, ② 에서 학생이 한 일(추천·지운 네모·더한 네모)을 /analyze 의 record 로 보낸다.
// 결과를 본 뒤의 [맞음][틀림]·"직접 고치기"는 /record 로 session.json 의 events 에 쌓는다 (api.md "기록 모드")
import { API_URL } from './api'
import type { PhotoBox } from './manualScene.ts'

export const RECORD = import.meta.env.DEV || import.meta.env.VITE_RECORD === '1'

export interface RecordSession {
  session: string
  photoSent: boolean // 원본 사진은 묶음마다 처음 한 번만
  suggested: PhotoBox[] // ② 에 들어갈 때 깔린 추천 네모
  sideways: boolean // 추천이 "사진이 누움"으로 멈췄는지
  removed: PhotoBox[] // 한 번 눌러 지운 네모 (#157)
  added: number // "도형 더하기"로 학생이 직접 더한 네모 수
}

let current: RecordSession | null = null

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// 새 기준 사진(고르기·돌리기·종이 펴기 뒤)마다 새 묶음
export function startSession(): RecordSession | null {
  current = RECORD ? { session: newId(), photoSent: false, suggested: [], sideways: false, removed: [], added: 0 } : null
  return current
}

export const session = () => current

// /analyze 에 붙일 record JSON. 실제로 읽은 네모와 문제 칸을 더한다
export function readRecord(parts: (PhotoBox | null)[], problemBox: PhotoBox | null): string | null {
  if (!current) return null
  const { photoSent: _sent, ...rest } = current
  return JSON.stringify({ ...rest, read: parts, problemBox })
}

// 결과를 본 뒤 학생이 한 일 (맞음·틀림·직접 고치기). 기록이 꺼져 있거나 실패해도 화면은 그대로
export function recordEvent(event: string, extra: Record<string, unknown> = {}) {
  if (!current) return
  void fetch(`${API_URL}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: current.session, event, ...extra }),
  }).catch(() => {})
}
