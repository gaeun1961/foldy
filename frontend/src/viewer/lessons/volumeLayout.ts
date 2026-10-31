// 부피 설명(TODO-26)의 단위 정육면체 배치. three.js 없이 숫자만 (npm test 로 검사).
// 직육면체 중심이 원점, x 가로, y 높이(아래가 −), z 깊이(앞이 +). shape-scene.md 꼭짓점 규칙과 같은 좌표다

export interface UnitCube {
  x: number // 중심
  y: number
  z: number
  sx: number // 크기. 치수가 정수가 아니면 마지막 조각은 1 보다 작다
  sy: number
  sz: number
  layer: number // 몇 번째 층 (0 = 바닥)
  index: number // 층 안에서 쌓이는 순서 (뒤 왼쪽 → 앞 오른쪽, 새 조각이 앞에 보이게)
}

// 치수가 정수가 아닐 때: 1 짜리 조각으로 채우고 남는 길이는 그만큼 얇은 조각 하나로 둔다 (2.5 → 1, 1, 0.5)
export function pieces(length: number) {
  const out: number[] = []
  for (let used = 0; used < length - 1e-9; used += 1) out.push(Math.min(1, length - used))
  return out
}

export function volumeLayout(width: number, depth: number, height: number) {
  const xs = pieces(width)
  const zs = pieces(depth)
  const ys = pieces(height)
  const cubes: UnitCube[] = []
  let y = -height / 2
  ys.forEach((sy, layer) => {
    let index = 0
    let z = -depth / 2 // 뒤부터
    for (const sz of zs) {
      let x = -width / 2
      for (const sx of xs) {
        cubes.push({ x: x + sx / 2, y: y + sy / 2, z: z + sz / 2, sx, sy, sz, layer, index: index++ })
        x += sx
      }
      z += sz
    }
    y += sy
  })
  return { cubes, layers: ys.length, perLayer: xs.length * zs.length }
}

// 원뿔 계단 (whyThird.ts): 고를 수 있는 원판 수와, 원판 부피의 합 ÷ 같은 밑면·높이의 원기둥 부피
export const STAIR_LAYERS = [4, 10, 50, 100] as const
export function stairRatio(layers: number, r = 1, h = 1) {
  let sum = 0
  for (let k = 0; k < layers; k++) sum += Math.PI * (r * (layers - k) / layers) ** 2 * (h / layers)
  return sum / (Math.PI * r * r * h)
}

// 정육면체(0~a)를 꼭짓점 (0,0,0) 에서 잘라 똑같은 사각뿔 3개로: 밑면은 그 꼭짓점이 없는 세 면. dir 은 빠져나가는 방향
export function cubePyramids(a: number) {
  const apex: [number, number, number] = [0, 0, 0]
  const pieces: { base: [number, number, number][]; dir: [number, number, number] }[] = [
    { base: [[a, 0, 0], [a, a, 0], [a, a, a], [a, 0, a]], dir: [1, 0, 0] },
    { base: [[0, a, 0], [a, a, 0], [a, a, a], [0, a, a]], dir: [0, 1, 0] },
    { base: [[0, 0, a], [a, 0, a], [a, a, a], [0, a, a]], dir: [0, 0, 1] },
  ]
  return pieces.map((p) => ({ apex, ...p }))
}

// 쌓기 진행률 (ui.md 공식 시각화 규칙): 첫 단계는 밑면을 칠하고, 그다음 n 층을 쌓는다. p 는 전체 0~1, layersP 는 층만의 0~1
export function stackProgress(layers: number, p: number) {
  const steps = layers + 1
  return { base: Math.min(1, Math.max(0, p * steps)), layersP: Math.min(1, Math.max(0, (p * steps - 1) / layers)) }
}

// 진행률 p (0 = 아직 없음, 1 = 다 쌓음) 를 층마다의 진행률로 나눈다. 단계별 접기(stepUnfold)와 같은 방식:
// 층 n 개면 p 를 n 칸으로 나눠 k 번째 층이 k 번째 칸에서 쌓인다. 층 안에서는 조각이 순서대로 하나씩 나타난다
export function layerProgress(layers: number, p: number) {
  return [...Array(layers).keys()].map((k) => Math.min(1, Math.max(0, p * layers - k)))
}
