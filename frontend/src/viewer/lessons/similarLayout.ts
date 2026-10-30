// 닮음 설명(TODO-29)의 계산 쪽: 원래 직육면체 옆에 놓을 k배 직육면체와, 그 안에 원래 것을 깔고 채우는 위치. 화면 물체는 만들지 않는다.
// 좌표는 원래 직육면체(접힌 입체, 중심이 원점) 기준. k배는 오른쪽에 바닥과 앞면을 맞춰 놓는다
import type { BoxSize } from '../../shared/types.ts'
import type { Vec3 } from '../polyhedra.ts'

export const SIMILAR_SCALES = [2, 3] // 고를 수 있는 닮음비 k

export function similarLayout({ width: w, depth: d, height: h }: BoxSize, k: number) {
  const gap = Math.max(w, d, h) * 0.3
  const x0 = w / 2 + gap // k배의 왼쪽 끝
  const y0 = -h / 2 // 바닥
  const z1 = d / 2 // 앞면
  const big = { min: [x0, y0, z1 - k * d] as Vec3, max: [x0 + k * w, y0 + k * h, z1] as Vec3 }
  // ① 길이: 원래 가로 모서리(앞 아래)와, k배의 앞 아래 모서리를 원래 가로 k개로 나눈 조각
  const edge = { from: [-w / 2, y0, z1] as Vec3, to: [w / 2, y0, z1] as Vec3 }
  const segments = Array.from({ length: k }, (_, i) => ({ from: [x0 + i * w, y0, z1] as Vec3, to: [x0 + (i + 1) * w, y0, z1] as Vec3 }))
  // ② 한 면: k배의 앞면을 원래 앞면(가로 × 높이) k × k 장으로 깐다. 아래 줄부터, 줄 안에서는 왼쪽부터
  const tiles = Array.from({ length: k * k }, (_, n) => {
    const [i, j] = [n % k, Math.floor(n / k)]
    return { center: [x0 + (i + 0.5) * w, y0 + (j + 0.5) * h, z1] as Vec3, width: w, height: h }
  })
  // ③ 부피: 원래 직육면체 k³ 개를 바닥 층부터 채운다. 층 안에서는 뒤 왼쪽부터 앞 오른쪽으로 (새 조각이 앞에 보이게, 부피 설명과 같음)
  const boxes = Array.from({ length: k ** 3 }, (_, n) => {
    const layer = Math.floor(n / (k * k))
    const index = n % (k * k)
    const [m, i] = [Math.floor(index / k), index % k] // m: 뒤(0) → 앞
    return { center: [x0 + (i + 0.5) * w, y0 + (layer + 0.5) * h, z1 - k * d + (m + 0.5) * d] as Vec3, layer, index }
  })
  return { big, edge, segments, tiles, boxes, perLayer: k * k, layers: k, size: [w, h, d] as Vec3 }
}

// 단계: 길이 1 + 한 면 1 + 부피 k 층 (부피는 더 어려워서 층마다 멈춘다, 리포트 T29 참고 자료)
export const similarSteps = (k: number) => 2 + k
