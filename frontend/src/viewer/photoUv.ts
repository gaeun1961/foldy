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
