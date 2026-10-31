// 문제 칸 안 도형·전개도 추천 네모 (docs/specs/worksheets.md "추천 네모", #151). LLM 없이 픽셀로 찾는다.
// 학습지 그림은 종이보다 어둡고 채도가 낮은 색으로 칠해져 있다 → 그런 픽셀 → 점선·글자로 끊긴 곳 잇기 → 덩어리마다 네모.
// 칸 배치(grid 면)는 찾지 않고 바깥 네모만. 라벨(ㄱ·ㄴ)이 들어가게 둘레를 조금 넓힌다. 못 찾으면 빈 목록 (학생이 직접 감싼다)
import type { PhotoBox } from './manualScene.ts'
import type { Pixels } from './perspective.ts'

export const SIDE = 480 // 문제 칸을 이 긴 변으로 줄여서 찾는다 (시제품 0.06~0.08초)
const MAX = 6
// 찾기 값 (두 학습지 사진으로 맞춤, 검사 suggestBoxes.test.ts)
export const TUNE = { pct: 0.9, near: 1, drop: 25 }

// 픽셀 → 찾은 도형 네모 (이 그림 비율 0~1, 위에서 아래·왼쪽에서 오른쪽 차례)
export function findShapeBoxes(px: Pixels): PhotoBox[] {
  const { width: W, height: H, data } = px
  const n = W * H
  const bright = new Uint8Array(n)
  for (let i = 0; i < n; i++) bright[i] = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  const paper = localPaper(bright, W, H) // 조명이 고르지 않아(한쪽이 어두움) 종이 밝기를 곳마다 따로
  let mask: Uint8Array = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]
    const mx = bright[i]
    const sat = mx - Math.min(r, g, b)
    const red = r - Math.max(g, b) > 40 // 빨간 펜·채점 표시
    mask[i] = mx < paper[i] - TUNE.drop && mx > 90 && sat < 60 && !red ? 1 : 0 // 종이보다 어둡고 글자(검정)보다 밝은 색칠
  }
  const k = Math.max(1, Math.round(Math.max(W, H) / 480)) // 줄인 크기 기준 걸음
  mask = dilate(erode(mask, W, H, 3 * k), W, H, 3 * k) // 작은 얼룩 지우기
  mask = erode(dilate(mask, W, H, 3 * k), W, H, 3 * k) // 점선·글자로 끊긴 면 잇기

  const found = label(mask, W, H).filter((c) => c.area >= 0.01 * n && c.w >= 0.06 * Math.min(W, H) && c.h >= 0.06 * Math.min(W, H))
  // 둘레를 넓히고 (라벨 자리), 서로 닿은 것은 한 도형으로
  const raw = merge(found.map((c) => ({ x: c.x / W, y: c.y / H, w: c.w / W, h: c.h / H })))
  const boxes = raw.map((b) => pad(b, raw))
  const mid = (b: PhotoBox) => b.y + b.h / 2 // 같은 줄(가운데 높이가 비슷)이면 왼쪽부터
  return boxes.sort((a, b) => (Math.abs(mid(a) - mid(b)) > 0.15 ? mid(a) - mid(b) : a.x - b.x)).slice(0, MAX)
}

// 사진의 problem 부분(사진 비율)에서 찾아 사진 비율 네모로. 실패하면 빈 목록
export function suggestShapes(img: HTMLImageElement, problem: PhotoBox): PhotoBox[] {
  try {
    const [W, H] = [img.naturalWidth, img.naturalHeight]
    const [sw, sh] = [problem.w * W, problem.h * H]
    const k = Math.min(1, SIDE / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw * k))
    canvas.height = Math.max(1, Math.round(sh * k))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, problem.x * W, problem.y * H, sw, sh, 0, 0, canvas.width, canvas.height)
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return findShapeBoxes(px).map((b) => ({ x: problem.x + b.x * problem.w, y: problem.y + b.y * problem.h, w: b.w * problem.w, h: b.h * problem.h }))
  } catch {
    return []
  }
}

// 곳마다 종이 밝기: 그림을 12×12 쯤의 칸으로 나눠 칸마다 밝은 쪽(90%) 값, 그 둘레 2칸 중 가장 밝은 값
// (색칠 면이 칸 하나를 다 덮어도 둘레에 종이가 있다)
function localPaper(v: Uint8Array, W: number, H: number): Uint8Array {
  const s = Math.max(8, Math.ceil(Math.max(W, H) / 12))
  const [cw, ch] = [Math.ceil(W / s), Math.ceil(H / s)]
  const cell = new Uint8Array(cw * ch)
  const hist = new Uint32Array(256)
  for (let cy = 0; cy < ch; cy++)
    for (let cx = 0; cx < cw; cx++) {
      hist.fill(0)
      let count = 0
      for (let y = cy * s; y < Math.min(H, (cy + 1) * s); y++)
        for (let x = cx * s; x < Math.min(W, (cx + 1) * s); x++, count++) hist[v[y * W + x]]++
      let seen = 0
      let p = 255
      for (let i = 0; i < 256; i++) if ((seen += hist[i]) >= TUNE.pct * count) { p = i; break }
      cell[cy * cw + cx] = p
    }
  const near = new Uint8Array(cw * ch)
  for (let cy = 0; cy < ch; cy++)
    for (let cx = 0; cx < cw; cx++) {
      let m = 0
      for (let y = Math.max(0, cy - TUNE.near); y <= Math.min(ch - 1, cy + TUNE.near); y++)
        for (let x = Math.max(0, cx - TUNE.near); x <= Math.min(cw - 1, cx + TUNE.near); x++) m = Math.max(m, cell[y * cw + x])
      near[cy * cw + cx] = m
    }
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = near[((y / s) | 0) * cw + ((x / s) | 0)]
  return out
}

// 정사각형 r 칸 안에 하나라도 있으면 (가로 → 세로 두 번에)
function dilate(m: Uint8Array, W: number, H: number, r: number): Uint8Array {
  return pass(pass(m, W, H, r, true, 1), W, H, r, false, 1)
}
function erode(m: Uint8Array, W: number, H: number, r: number): Uint8Array {
  return pass(pass(m, W, H, r, true, 0), W, H, r, false, 0)
}
// 한 줄씩 창 [i-r, i+r] 안의 1 개수 (누적합). dilate: 하나라도 있으면 1. erode: 그림 안 창이 모두 1 이면 1
function pass(m: Uint8Array, W: number, H: number, r: number, horizontal: boolean, grow: 0 | 1): Uint8Array {
  const out = new Uint8Array(m.length)
  const [lines, len] = horizontal ? [H, W] : [W, H]
  const sum = new Uint32Array(len + 1)
  for (let line = 0; line < lines; line++) {
    const at = (i: number) => (horizontal ? line * W + i : i * W + line)
    for (let i = 0; i < len; i++) sum[i + 1] = sum[i] + m[at(i)]
    for (let i = 0; i < len; i++) {
      const [lo, hi] = [Math.max(0, i - r), Math.min(len - 1, i + r)]
      const ones = sum[hi + 1] - sum[lo]
      out[at(i)] = grow ? (ones > 0 ? 1 : 0) : ones === hi - lo + 1 ? 1 : 0
    }
  }
  return out
}

type Blob = { x: number; y: number; w: number; h: number; area: number }
function label(m: Uint8Array, W: number, H: number): Blob[] {
  const seen = new Uint8Array(m.length)
  const stack: number[] = []
  const blobs: Blob[] = []
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || seen[s]) continue
    let [x0, y0, x1, y1, area] = [W, H, 0, 0, 0]
    seen[s] = 1
    stack.push(s)
    while (stack.length) {
      const p = stack.pop()!
      const [x, y] = [p % W, (p / W) | 0]
      area++
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q >= 0 && m[q] && !seen[q]) {
          seen[q] = 1
          stack.push(q)
        }
      }
    }
    blobs.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area })
  }
  return blobs
}

// 라벨(ㄱ·ㄴ)·바깥 선이 들어가게 네모를 넓힌다. 그림 밖으로, 옆 도형과의 가운데 너머로는 안 넓힌다
// (넓힌 네모에 옆 도형이 들어가면 인식이 그 도형을 읽을 수 있다)
function pad(b: PhotoBox, all: PhotoBox[]): PhotoBox {
  const [dx, dy] = [Math.max(0.25 * b.w, 0.02), Math.max(0.25 * b.h, 0.02)]
  let [x0, y0, x1, y1] = [Math.max(0, b.x - dx), Math.max(0, b.y - dy), Math.min(1, b.x + b.w + dx), Math.min(1, b.y + b.h + dy)]
  for (const o of all) {
    if (o === b) continue
    const sideBySide = o.y < b.y + b.h + dy && o.y + o.h > b.y - dy // 높이가 겹치면 왼쪽·오른쪽 이웃
    const stacked = o.x < b.x + b.w + dx && o.x + o.w > b.x - dx
    if (sideBySide && o.x + o.w <= b.x) x0 = Math.max(x0, (o.x + o.w + b.x) / 2)
    if (sideBySide && o.x >= b.x + b.w) x1 = Math.min(x1, (b.x + b.w + o.x) / 2)
    if (stacked && o.y + o.h <= b.y) y0 = Math.max(y0, (o.y + o.h + b.y) / 2)
    if (stacked && o.y >= b.y + b.h) y1 = Math.min(y1, (b.y + b.h + o.y) / 2)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

// 많이 겹치는 네모는 하나로 (한 전개도가 두 덩어리로 갈린 경우)
function merge(boxes: PhotoBox[]): PhotoBox[] {
  const out = [...boxes]
  for (let changed = true; changed; ) {
    changed = false
    for (let i = 0; i < out.length && !changed; i++) {
      for (let j = i + 1; j < out.length && !changed; j++) {
        const [a, b] = [out[i], out[j]]
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        if (ix > 0 && iy > 0 && ix * iy > 0.3 * Math.min(a.w * a.h, b.w * b.h)) {
          const x = Math.min(a.x, b.x)
          const y = Math.min(a.y, b.y)
          out[i] = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
          out.splice(j, 1)
          changed = true
        }
      }
    }
  }
  return out
}
