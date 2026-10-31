// 학습지 사진을 전개도 면에 입히기 위한 UV 계산 (docs/specs/worksheets.md W6, 홀로그램 세션 인계). three.js 없음 (photoUv.test.ts).
// 책 장면이 사진을 까는 방식(ThreeViewer: 루트 좌표 위치 (x, −y), z축 −angle°, 크기 size × 가로세로 비율)을 거꾸로 풀어,
// 다 펼친 전개도(grid) 위의 점이 사진의 어디(u 왼→오 0~1, v 아래→위 0~1)에 오는지 구한다. 면 메시 uv 에 넣으면 접어도 사진 조각이 그 면을 따라간다
import type { NetFace } from '../shared/types.ts'
import type { NetPhoto } from './index.ts'

// aspect: 사진 가로 / 세로 (사진은 size 정사각형 안에 비율대로 들어간다)
export function netPointUv(nx: number, ny: number, photo: Pick<NetPhoto, 'x' | 'y' | 'size' | 'angle'>, aspect: number): { u: number; v: number } {
  const dx = nx - photo.x
  const dy = photo.y - ny // 전개도 y 는 아래로, 루트·사진 y 는 위로
  const a = (photo.angle * Math.PI) / 180 // 사진을 −angle 돌려 깔았으니 점을 +angle 돌리면 사진 안 좌표
  const rx = dx * Math.cos(a) - dy * Math.sin(a)
  const ry = dx * Math.sin(a) + dy * Math.cos(a)
  const sx = photo.size * Math.min(1, aspect)
  const sy = photo.size * Math.min(1, 1 / aspect)
  return { u: rx / sx + 0.5, v: ry / sy + 0.5 }
}

// grid 면 하나의 네 꼭짓점 UV: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 (전개도에서 본 순서)
export function faceUvs(face: NetFace, photo: Pick<NetPhoto, 'x' | 'y' | 'size' | 'angle'>, aspect: number) {
  return [
    [face.x, face.y],
    [face.x + face.w, face.y],
    [face.x + face.w, face.y + face.h],
    [face.x, face.y + face.h],
  ].map(([x, y]) => netPointUv(x, y, photo, aspect))
}

// 종이 밝기: 사진마다 다르다 (그늘지면 회색). 밝은 쪽 20% 의 경계를 종이로 본다
export function paperLuminance(data: Uint8ClampedArray): number {
  const counts = new Array<number>(256).fill(0)
  let n = 0
  for (let i = 0; i < data.length; i += 16) {
    counts[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++
    n++
  }
  let seen = 0
  for (let v = 255; v >= 0; v--) {
    seen += counts[v]
    if (seen >= n * 0.2) return Math.max(v, 1)
  }
  return 255
}

// 홀로그램용 사진 (theme.photo 'glow', 아크릴): 흰색으로 바꾸고 투명도만 남긴다. 종이는 base(면 색의 평소 불투명도),
// 인쇄·연필 선은 불투명. 면 재질 색(facePalette)과 곱해져서 면은 평소처럼 형형색색 반투명, 선·글자는 그 색으로 진하게 빛난다.
// paper 를 주지 않으면 사진에서 잰다. RGBA 를 그 자리에서 바꾼다
export function glowPixels(data: Uint8ClampedArray, base = 0.35, paper = paperLuminance(data)): void {
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const ink = Math.max(0, Math.min(1, (paper - lum) / (paper * 0.45))) // 종이보다 얼마나 어두운가
    data[i] = data[i + 1] = data[i + 2] = 255
    data[i + 3] = Math.round(255 * (base + (1 - base) * ink))
  }
}
