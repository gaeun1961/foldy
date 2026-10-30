// 모서리 길이 글자의 내용과 자리 (docs/specs/viewer.md "모서리 길이 표시"). three.js 없이 숫자만 (npm test 로 검사)
import type { BoxSize } from '../../shared/types.ts'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'

export interface LengthLabel {
  text: string
  at: Vec3
}

export const lengthText = (n: number) => `${+n.toFixed(2)} cm`

// 입체 (가운데가 원점인 상자): 앞 아래 = 가로, 오른쪽 아래 = 세로, 앞 오른쪽 = 높이. 모서리에서 gap 만큼 바깥에
export function boxLengthLabels({ width: w, depth: d, height: h }: BoxSize): LengthLabel[] {
  const gap = Math.max(w, d, h) * 0.08
  return [
    { text: lengthText(w), at: [0, -h / 2 - gap, d / 2 + gap] },
    { text: lengthText(d), at: [w / 2 + gap, -h / 2 - gap, 0] },
    { text: lengthText(h), at: [w / 2 + gap, 0, d / 2 + gap] },
  ]
}

// 전개도: 면마다 이웃한 두 변의 길이를 변 안쪽에. 좌표는 면 메시 기준(접힌 좌표)이라 면에 붙이면 접힘을 따라간다
export function faceLengthLabels(poly: Polyhedron, face: number): LengthLabel[] {
  const pts = poly.faces[face].vertices.map((v) => poly.positions[v])
  const center = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length)
  return [0, 1].map((k) => {
    const [a, b] = [pts[k], pts[k + 1]]
    const mid = [0, 1, 2].map((i) => (a[i] + b[i]) / 2)
    return { text: lengthText(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])), at: mid.map((m, i) => m + (center[i] - m) * 0.3) as Vec3 }
  })
}
