// 아크릴 피라미드 홀로그램(Pepper's ghost) 화면 배치 계산. three.js 없음 (holoLayout.test.ts 로 확인).
// 제안 문서: docs/proposals/hologram/README.md
//
// 화면 가운데 정사각형(한 변 L) 안에 작은 정사각형(한 변 c, 피라미드 꼭지가 놓이는 곳)을 두고,
// 둘레를 대각선으로 나눈 사다리꼴 4칸(아래·오른쪽·위·왼쪽)에 도형을 네 방향에서 본 모습을 그린다.
// 좌표는 화면 가운데가 원점, x 오른쪽, y 위 (수학 좌표, CSS 와 y 반대).
//
// 반사 규칙 (뒤집힌 피라미드, 45° 면):
// - 칸의 바깥쪽(가운데에서 먼 쪽)이 떠 보이는 도형의 위쪽이다 → 그림의 v(위)는 바깥 방향
// - 그 칸 쪽에 선 사람의 오른쪽이 그림의 u(오른쪽)다. 거울 면이 그 방향을 그대로 두므로 좌우는 화면 그대로
// - 아래 칸 쪽 사람은 도형의 앞(+z), 오른쪽 칸 쪽 사람은 도형의 오른쪽(+x)을 본다

export type Side = 'bottom' | 'right' | 'top' | 'left'
export const SIDES: Side[] = ['bottom', 'right', 'top', 'left']

export type V2 = [number, number]

export interface Region {
  side: Side
  outward: V2 // 가운데에서 바깥으로 (단위 벡터)
  right: V2 // 그 칸 쪽에 서서 가운데를 보는 사람의 오른쪽 (단위 벡터)
  corners: V2[] // 사다리꼴 꼭짓점 4개: 안쪽 왼, 안쪽 오른, 바깥 오른, 바깥 왼 (보는 사람 기준)
  azimuth: number // 카메라 방향각 (라디안). 0 = 앞(+z), π/2 = 오른쪽(+x)
}

const OUTWARD: Record<Side, V2> = { bottom: [0, -1], right: [1, 0], top: [0, 1], left: [-1, 0] }
const AZIMUTH: Record<Side, number> = { bottom: 0, right: Math.PI / 2, top: Math.PI, left: -Math.PI / 2 }

const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1]
const add = (...vs: V2[]): V2 => vs.reduce<V2>((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0])
const mul = (v: V2, k: number): V2 => [v[0] * k, v[1] * k]

// 보는 사람은 가운데를 향해(−outward) 선다. 수학 좌표에서 방향 d 의 오른쪽은 (d.y, −d.x)
export function rightOf(outward: V2): V2 {
  const d: V2 = [-outward[0], -outward[1]]
  return [d[1] + 0, -d[0] + 0] // + 0: −0 을 0 으로
}

export function regions(L: number, c: number): Region[] {
  const half = L / 2
  const inner = c / 2
  return SIDES.map((side) => {
    const outward = OUTWARD[side]
    const right = rightOf(outward)
    const corners: V2[] = [
      add(mul(outward, inner), mul(right, -inner)),
      add(mul(outward, inner), mul(right, inner)),
      add(mul(outward, half), mul(right, half)),
      add(mul(outward, half), mul(right, -half)),
    ]
    return { side, outward, right, corners, azimuth: AZIMUTH[side] }
  })
}

// 칸 하나를 덮는 그림(가로 L × 세로 (L − c)/2 직사각형)에서 화면 점 p 의 텍스처 좌표.
// u: 보는 사람 기준 왼쪽 0 → 오른쪽 1, v: 안쪽(도형 아래) 0 → 바깥(도형 위) 1.
// mirror 면 u 를 뒤집는다 (실물에서 좌우가 반대로 보이면 켠다)
export function uvOf(region: Region, L: number, c: number, p: V2, mirror = false): V2 {
  const h = (L - c) / 2
  const u = (dot(p, region.right) + L / 2) / L
  const v = (dot(p, region.outward) - c / 2) / h
  return [mirror ? 1 - u : u, v]
}

// 도형 크기 맞추기: 반지름 R 인 구(도형이 돌고 접히는 동안 차지하는 범위)가 칸 가운데 높이에 들어가게 한다.
// 칸 가운데 높이의 사다리꼴 폭은 (c + L)/2. 그림 세로 h = (L − c)/2.
// 원근 카메라(세로 시야각 fov)를 구 중심에서 distance 만큼 떨어뜨리면 구가 그림에서 지름 fill × min(폭, h) 이 된다
export function fitDistance(L: number, c: number, R: number, fovDeg: number, fill = 0.95) {
  const h = (L - c) / 2
  const midWidth = (c + L) / 2
  const diameterPx = fill * Math.min(midWidth, h)
  const pxPerUnit = diameterPx / (2 * R)
  const halfHeightUnits = h / 2 / pxPerUnit // 그림 세로 절반이 세계 단위로 얼마인지
  return halfHeightUnits / Math.tan(((fovDeg / 2) * Math.PI) / 180)
}
