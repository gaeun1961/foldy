// 내 학습지 보관함 검사. 실행: frontend 폴더에서 `npm test` (IndexedDB 가 없는 Node 라 이름·지울 목록만)
import type { ShapeScene } from '../shared/types.ts'
import { defaultName, overflow } from './worksheetStore.ts'

const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}
const eq = (a: unknown, b: unknown) => check(JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`)

const cube = { shape: 'cube', size: { edge: 1 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } } as ShapeScene
eq(defaultName(cube, new Date(2026, 9, 31, 9, 5)), '정육면체 · 10/31 09:05')

// 30개 꽉 찼으면 가장 오래된 1개를 지우고 새로 넣는다. 덜 찼으면 지우지 않는다
const items = Array.from({ length: 30 }, (_, i) => ({ id: `w${i}`, savedAt: 1000 + i }))
eq(overflow(items), ['w0'])
eq(overflow(items.slice(0, 5)), [])
// 최대 3개: 새것 자리 하나를 두고 최신 2개(w3, w2)만 남긴다
eq(overflow(items.slice(0, 4), 3), ['w1', 'w0'])

console.log('ok: 내 학습지 보관함 (기본 이름, 30개 넘으면 오래된 것부터)')
