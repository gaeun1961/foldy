import { dhash, sameKey, findAnswer, judgeAnswers } from './answerBank.ts'
import type { ShapeScene } from '../shared/types.ts'

function ok(value: unknown) { if (!value) throw new Error('정답 은행 검증 실패') }
const key = { shape: 'a', problem: 'b', shapeDHash: '0', problemDHash: '0' }
ok(sameKey(key, { ...key }))
ok(!sameKey(key, { ...key, problem: '다른 숫자' }))
ok(!sameKey(key, { ...key, shapeDHash: '1' }))
ok(dhash(Array(72).fill(128)) === '0000000000000000')
ok(dhash(Array.from({ length: 72 }, (_, i) => 255 - i % 9)) === 'ffffffffffffffff')
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
} })
const scene = { shape: 'cube', size: { edge: 1 }, net: { layout: 'cross' }, vertexLabels: Array(8).fill(null), lines: [] } as ShapeScene
ok(findAnswer(key) === null)
judgeAnswers([{ key, scene }], true)
ok(findAnswer(key)?.shape === 'cube')
ok(findAnswer({ ...key, problem: '다름' }) === null)
judgeAnswers([{ key, scene }], false)
ok(findAnswer(key) === null)
memory.set('foldy-answer-bank-v1', '{broken')
ok(findAnswer(key) === null)
console.log('정답 은행: 문제 분리·맞음 저장·틀림 제거·손상 복구 통과')
