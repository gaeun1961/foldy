// 비스듬히 찍은 학습지 펴기 (docs/specs/mobile.md M3). 사진 위 네 귀퉁이를 반듯한 직사각형으로 옮긴다.
// DOM·three.js 없이 계산만 한다 (perspective.test.ts). 화면은 CornerPick.tsx
import { fitSize } from './photoPrep.ts'

export type Pt = { x: number; y: number }
// ImageData 와 같은 모양 (Node 검사에서도 쓰려고 타입만 맞춘다)
export type Pixels = { data: Uint8ClampedArray; width: number; height: number }

// src 네 점을 dst 네 점으로 보내는 3×3 사영 변환 (행 순서 9개, 마지막은 1)
export function homography(src: Pt[], dst: Pt[]): number[] {
  // [x y 1 0 0 0 -X*x -X*y] h = X, [0 0 0 x y 1 -Y*x -Y*y] h = Y 를 8×8 로 푼다
  const A: number[][] = []
  src.forEach(({ x, y }, i) => {
    const { x: X, y: Y } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X])
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y, Y])
  })
  for (let c = 0; c < 8; c++) {
    let p = c // 가장 큰 값을 피벗으로 (계산 오차 줄이기)
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    if (Math.abs(A[p][c]) < 1e-12) throw new Error('네 점이 한 줄에 있어요')
    ;[A[c], A[p]] = [A[p], A[c]]
    for (let r = 0; r < 8; r++) {
      if (r === c) continue
      const k = A[r][c] / A[c][c]
      for (let j = c; j < 9; j++) A[r][j] -= k * A[c][j]
    }
  }
  return [...A.map((row, i) => row[8] / row[i]), 1]
}

export function applyH(H: number[], { x, y }: Pt): Pt {
  const w = H[6] * x + H[7] * y + H[8]
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w }
}

// 펼 결과 크기: 마주 보는 변 길이의 평균, 긴 변은 maxSide 이하. corners 는 왼쪽 위·오른쪽 위·오른쪽 아래·왼쪽 아래 (픽셀)
export function flatSize(corners: Pt[], maxSide: number): { w: number; h: number } {
  const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
  const [tl, tr, br, bl] = corners
  return fitSize((d(tl, tr) + d(bl, br)) / 2, (d(tl, bl) + d(tr, br)) / 2, maxSide)
}

// src 의 네 귀퉁이 안쪽을 outW×outH 직사각형으로 편다 (결과 픽셀마다 원래 자리를 찾아 이웃 네 픽셀을 섞는다)
export function warp(src: Pixels, corners: Pt[], outW: number, outH: number): Pixels {
  const H = homography(
    [
      { x: 0, y: 0 },
      { x: outW, y: 0 },
      { x: outW, y: outH },
      { x: 0, y: outH },
    ],
    corners,
  )
  const out = new Uint8ClampedArray(outW * outH * 4)
  const { data, width: W, height: Hh } = src
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const p = applyH(H, { x: x + 0.5, y: y + 0.5 }) // 픽셀 가운데
      const sx = Math.min(W - 1, Math.max(0, p.x - 0.5))
      const sy = Math.min(Hh - 1, Math.max(0, p.y - 0.5))
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const x1 = Math.min(W - 1, x0 + 1)
      const y1 = Math.min(Hh - 1, y0 + 1)
      const fx = sx - x0
      const fy = sy - y0
      const o = (y * outW + x) * 4
      for (let c = 0; c < 4; c++) {
        const top = data[(y0 * W + x0) * 4 + c] * (1 - fx) + data[(y0 * W + x1) * 4 + c] * fx
        const bottom = data[(y1 * W + x0) * 4 + c] * (1 - fx) + data[(y1 * W + x1) * 4 + c] * fx
        out[o + c] = top * (1 - fy) + bottom * fy
      }
    }
  }
  return { data: out, width: outW, height: outH }
}
