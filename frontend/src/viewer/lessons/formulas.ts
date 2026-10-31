// 겉넓이·부피의 일반 공식과 글자 색 (ui.md "도형별 일반 공식"). 책 글자와 3D 길이 선이 같은 색을 쓴다. three.js 없음
import type { ShapeKind } from '../../shared/types.ts'
import type { PiMode } from './lengthLabels.ts'

export const LENGTH_COLOR = { a: '#c2255c', b: '#2f9e44', c: '#1c7ed6', r: '#2f9e44', h: '#1c7ed6', l: '#e8590c' }

export const SECTION_RADIUS_COLOR = '#e8590c' // 구 단면 비교의 단면 반지름

// 공식 속 글자·낱말의 색. 높이는 어느 도형에서나 파랑
const TOKEN_COLOR: Record<string, string> = { ...LENGTH_COLOR, 가로: LENGTH_COLOR.a, '한 변': LENGTH_COLOR.a, 세로: LENGTH_COLOR.b, 반지름: LENGTH_COLOR.r, 높이: LENGTH_COLOR.h, 모선: LENGTH_COLOR.l, '단면 반지름': SECTION_RADIUS_COLOR }
const TOKENS = /(단면 반지름|가로|세로|높이|반지름|모선|한 변|[abcrhl])/

// 공식을 글자 색 조각으로 나눈다 (color 가 없으면 평소 글자색)
export const colorTokens = (text: string) => text.split(TOKENS).filter(Boolean).map((part) => ({ text: part, color: TOKEN_COLOR[part] as string | undefined }))

const ONE_FACE = '면 하나 넓이 × 면 개수'
// [중등 문자 공식, 초등 말 공식]
const GENERAL: Partial<Record<ShapeKind, { 'surface-area': [string, string]; volume?: [string, string] }>> = {
  cuboid: { 'surface-area': ['2(ab + bc + ca)', '(가로 × 세로 + 세로 × 높이 + 높이 × 가로) × 2'], volume: ['abc', '가로 × 세로 × 높이'] },
  cube: { 'surface-area': ['6a²', '한 변 × 한 변 × 6'], volume: ['a³', '한 변 × 한 변 × 한 변'] },
  prism: { 'surface-area': ['(밑넓이) × 2 + (옆넓이)', '밑넓이 × 2 + 옆넓이'], volume: ['(밑넓이) × h', '밑넓이 × 높이'] },
  cylinder: { 'surface-area': ['2πr² + 2πrh', '밑넓이 × 2 + 옆넓이'], volume: ['πr²h', '밑넓이 × 높이'] },
  pyramid: { 'surface-area': ['(밑넓이) + (옆넓이)', '밑넓이 + 옆넓이'], volume: ['⅓ × (밑넓이) × h', '밑넓이 × 높이 ÷ 3'] },
  cone: { 'surface-area': ['πr² + πrl (l = 모선)', '밑넓이 + 옆넓이'], volume: ['⅓πr²h', '밑넓이 × 높이 ÷ 3'] },
  sphere: { 'surface-area': ['4πr²', '반지름 × 반지름 × 3.14 × 4'], volume: ['⁴⁄₃πr³', '반지름 × 반지름 × 반지름 × 3.14 × 4 ÷ 3'] },
  'regular-tetrahedron': { 'surface-area': ['√3a²', ONE_FACE], volume: ['(√2/12)a³', '밑넓이 × 높이 ÷ 3'] },
  'regular-octahedron': { 'surface-area': ['2√3a²', ONE_FACE], volume: ['(√2/3)a³', '사각뿔 부피 × 2'] },
  'regular-dodecahedron': { 'surface-area': [ONE_FACE, ONE_FACE] },
  'regular-icosahedron': { 'surface-area': [ONE_FACE, ONE_FACE] },
}

export function generalFormula(shape: ShapeKind, kind: string, mode: PiMode) {
  if (kind !== 'surface-area' && kind !== 'volume') return null
  return GENERAL[shape]?.[kind]?.[mode === 'pi' ? 0 : 1] ?? null
}
