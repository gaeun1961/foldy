// 회전체의 숫자 쪽 (viewer.md "회전체", "단면"): 평면도형의 둘레, 단면 계산, 단면 이름. three.js 없음
import type { RevolutionSize } from '../../shared/types.ts'

export const heightOf = (size: RevolutionSize) => (size.figure === 'semicircle' ? 2 * size.radius : size.height)

// 돌리는 평면도형의 둘레 (축에서 거리, 높이). 축에 붙어 있으면 처음과 끝이 축 위, 떨어뜨리면 닫힌 모양
export function profileOf(size: RevolutionSize): [number, number][] {
  const { figure, radius: w, top = w, gap } = size
  const h = heightOf(size)
  const base: [number, number][] =
    figure === 'rectangle'
      ? [[0, 0], [w, 0], [w, h], [0, h]]
      : figure === 'right-triangle'
        ? [[0, 0], [w, 0], [0, h]]
        : figure === 'trapezoid'
          ? [[0, 0], [w, 0], [top, h], [0, h]]
          : [...Array(49).keys()].map((i): [number, number] => [w * Math.sin((i / 48) * Math.PI), w - w * Math.cos((i / 48) * Math.PI)])
  const moved = base.map(([x, y]): [number, number] => [x + gap, y])
  return gap > 0 ? [...moved, moved[0]] : moved
}

export const reachOf = (size: RevolutionSize) => Math.max(...profileOf(size).map((p) => p[0]))

// 단면의 방향과 평면: 축 위 높이 y0 을 지나고, 수평에서 angle 만큼 기운다. 세로는 축을 품는다
export type CutKind = 'vertical' | 'horizontal' | 'tilted'
export const cutAngle = (kind: CutKind) => (kind === 'vertical' ? Math.PI / 2 : kind === 'tilted' ? (35 * Math.PI) / 180 : 0)

// 높이 y 에서 둘레의 안쪽 거리와 바깥 거리 (볼록한 도형이라 구간 하나). 도형 밖이면 null
function sliceAt(profile: [number, number][], y: number): [number, number] | null {
  const xs: number[] = []
  profile.forEach(([x0, y0], i) => {
    const [x1, y1] = profile[(i + 1) % profile.length]
    if (Math.min(y0, y1) <= y && y <= Math.max(y0, y1)) {
      if (y0 === y1) xs.push(x0, x1)
      else xs.push(x0 + ((x1 - x0) * (y - y0)) / (y1 - y0))
    }
  })
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null
}

// 단면을 평면 위 띠로 나눈다: 평면 좌표 u (기운 방향) 마다 v (앞뒤 방향) 의 구간들. 가운데가 뚫리면 구간이 둘
export function sectionStrips(size: RevolutionSize, kind: CutKind, cut: number, count = 160) {
  const profile = profileOf(size)
  const h = heightOf(size)
  const reach = reachOf(size)
  const a = cutAngle(kind)
  const [c, s] = [Math.cos(a), Math.sin(a)]
  const y0 = kind === 'vertical' ? 0 : Math.min(1, Math.max(0, cut)) * h
  const [from, to] = kind === 'vertical' ? [0, h] : [-reach / c, reach / c]
  return [...Array(count + 1).keys()].map((i) => {
    const u = from + ((to - from) * i) / count
    const [x, y] = [u * c, y0 + u * s]
    const range = y < 0 || y > h ? null : sliceAt(profile, y)
    const spans: [number, number][] = []
    if (range && range[1] > Math.abs(x)) {
      const outer = Math.sqrt(range[1] ** 2 - x * x)
      if (range[0] > Math.abs(x)) {
        const inner = Math.sqrt(range[0] ** 2 - x * x)
        spans.push([-outer, -inner], [inner, outer])
      } else spans.push([-outer, outer])
    }
    return { u, spans }
  })
}

// 단면 모양의 이름. 평면이 입체를 지나지 않으면 null
export function sectionName(size: RevolutionSize, kind: CutKind, cut: number) {
  const strips = sectionStrips(size, kind, cut, 400)
  const filled = strips.filter((s) => s.spans.length)
  if (!filled.length) return null
  const { figure, gap } = size
  if (kind === 'vertical') {
    if (gap > 0) return `떨어진 ${{ rectangle: '직사각형', 'right-triangle': '직각삼각형', semicircle: '반원', trapezoid: '사다리꼴' }[figure]} 두 개`
    return { rectangle: '직사각형', 'right-triangle': '이등변삼각형', semicircle: '원', trapezoid: '등변사다리꼴' }[figure]
  }
  if (kind === 'horizontal') return filled.some((s) => s.spans.length === 2) ? '고리' : '원'
  if (figure === 'semicircle' && gap === 0) return '원'
  if (filled.some((s) => s.spans.length === 2)) return '가운데가 뚫린 모양'
  // 비스듬히: 평면이 위나 아래 면에 걸리면 끝이 곧게 잘린다
  const width = ({ spans }: { spans: [number, number][] }) => spans.reduce((sum, [a, b]) => sum + b - a, 0)
  // 곡선으로 닫히면 끝의 폭이 가장 넓은 곳보다 훨씬 좁다
  const cutOff = Math.max(width(filled[0]), width(filled[filled.length - 1])) > Math.max(...filled.map(width)) * 0.3
  return cutOff ? '타원이 잘린 모양' : '타원'
}
