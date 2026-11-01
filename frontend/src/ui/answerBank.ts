import type { ShapeScene } from '../shared/types.ts'

export interface AnswerKey { shape: string; problem: string; shapeDHash: string; problemDHash: string }
export interface BankEntry { key: AnswerKey; scene: ShapeScene }
const STORAGE = 'foldy-answer-bank-v1'

// dHash만으로는 숫자 한 글자가 다른 문제를 구분할 수 없어 SHA도 일치해야 한다.
export function sameKey(a: AnswerKey, b: AnswerKey): boolean {
  return ['shape', 'problem', 'shapeDHash', 'problemDHash'].every((key) => {
    const k = key as keyof AnswerKey
    return typeof a[k] === 'string' && a[k].length > 0 && a[k] === b[k]
  })
}

export function dhash(gray: number[]): string {
  if (gray.length !== 72) throw new Error('9×8 픽셀이 필요합니다')
  let bits = 0n
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits = (bits << 1n) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1n : 0n)
  return bits.toString(16).padStart(16, '0')
}

async function hashes(file: File): Promise<[string, string]> {
  const bytes = await file.arrayBuffer()
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 9; canvas.height = 8
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, 9, 8)
    const { data } = ctx.getImageData(0, 0, 9, 8)
    return [sha, dhash(Array.from({ length: 72 }, (_, i) => data[i * 4] * .299 + data[i * 4 + 1] * .587 + data[i * 4 + 2] * .114))]
  } finally { bitmap.close() }
}

export async function answerKey(shape: File, problem?: File): Promise<AnswerKey | null> {
  if (!problem) return null
  try {
    const [[s, sd], [p, pd]] = await Promise.all([hashes(shape), hashes(problem)])
    return { shape: s, problem: p, shapeDHash: sd, problemDHash: pd }
  } catch { return null }
}

function entries(): BankEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || '[]')
    return Array.isArray(value) ? value.filter((v) => v?.key && v?.scene?.shape && v?.scene?.net && v?.scene?.size).slice(-50) : []
  } catch { return [] }
}

export function findAnswer(key: AnswerKey | null): ShapeScene | null {
  return key ? entries().find((entry) => sameKey(entry.key, key))?.scene ?? null : null
}

export function judgeAnswers(current: BankEntry[], right: boolean): void {
  try {
    const kept = entries().filter((entry) => !current.some((item) => sameKey(entry.key, item.key)))
    localStorage.setItem(STORAGE, JSON.stringify([...kept, ...(right ? current : [])].slice(-50)))
  } catch { /* 저장 실패는 인식 결과를 바꾸지 않는다. */ }
}
