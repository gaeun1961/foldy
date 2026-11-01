// 문제 칸 안 도형·전개도 추천 네모 (docs/specs/worksheets.md "추천 네모", #151). LLM 없이 픽셀로 찾는다.
// 학습지 그림은 종이보다 어둡고 채도가 낮은 색으로 칠해져 있다 → 그런 픽셀 → 점선·글자로 끊긴 곳 잇기 → 덩어리마다 네모.
// 칸 배치(grid 면)는 찾지 않고 바깥 네모만. 라벨(ㄱ·ㄴ)이 들어가게 둘레를 조금 넓힌다. 못 찾으면 빈 목록 (학생이 직접 감싼다)
// 문제 칸을 넉넉히 그리면 책 페이지 그림자·제본 쪽 어두운 띠가 들어온다 → 칸 가장자리를 따라 붙은 덩어리는 버린다
// 사진이 옆으로 누워 있으면(글 줄이 세로) 찾지 않고 sideways 로 알려 "먼저 돌려 주세요" (누운 글 줄·손글씨를 도형과 픽셀로 못 가름, 휴대폰 실측)
// 밝기 값은 곳마다 종이 밝기에 대한 비율 (어두운 휴대폰 사진)
import type { PhotoBox } from './manualScene.ts'
import type { Pixels } from './perspective.ts'

export const SIDE = 480 // 문제 칸을 이 긴 변으로 줄여서 찾는다 (시제품 0.06~0.08초)
const MAX = 6
// 찾기 값 (두 학습지 사진으로 맞춤, 검사 suggestBoxes.test.ts)
// drop·ink·dark: 종이 밝기에 대한 비율 (밝은 종이 200 에서 25·70·90 어두운 것과 같다)
export const TUNE = { pct: 0.9, near: 1, drop: 0.875, ink: 0.65, dark: 0.45, sharp: 11, open: 4 }

// 글 줄이 세로인가. 가는 획(글자)만 남겨 행·열로 더해 보면, 글 줄 방향을 가로지르는 쪽에만 줄 사이 빈 칸이 줄줄이 생긴다
// (글자 사이 틈은 줄마다 어긋나 빈 칸이 안 된다). 두꺼운 검정(책 그림자·진한 면)은 빼야 한다 — 그림자 띠가 열을 채워 틀렸다
// 실측: 옆으로 누운 사진 빈 칸 비율 열 0.39~0.44 / 행 0.06~0.16, 바로 선 사진은 반대 (두 학습지 10가지 모두 맞음)
export function sideways(px: Pixels): boolean {
  const { width: W, height: H, data } = px
  const n = W * H
  const bright = new Uint8Array(n)
  for (let i = 0; i < n; i++) bright[i] = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  const paper = localPaper(bright, W, H)
  const ink = new Uint8Array(n)
  for (let i = 0; i < n; i++) ink[i] = bright[i] < paper[i] * TUNE.ink && data[i * 4] - Math.max(data[i * 4 + 1], data[i * 4 + 2]) <= 40 ? 1 : 0
  const k = Math.max(1, Math.round(Math.max(W, H) / 480))
  const thick = dilate(erode(ink, W, H, 2 * k), W, H, 2 * k)
  const rows = new Float64Array(H)
  const cols = new Float64Array(W)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (ink[y * W + x] && !thick[y * W + x]) {
        rows[y]++
        cols[x]++
      }
  const gaps = (v: Float64Array) => {
    const s = v.map((_, i) => (v[Math.max(0, i - 1)] + v[i] + v[Math.min(v.length - 1, i + 1)]) / 3)
    let [a, b] = [0, s.length - 1]
    while (a < b && s[a] === 0) a++
    while (b > a && s[b] === 0) b--
    const seg = Array.from(s.subarray(a, b + 1))
    const filled = seg.filter((x) => x > 0).sort((p, q) => p - q) // 빈 칸이 대부분이어도 기준이 0 이 되지 않게 찬 칸에서
    const p90 = filled.length ? filled[Math.floor(0.9 * (filled.length - 1))] : 0
    return p90 ? seg.filter((x) => x < 0.1 * p90).length / seg.length : 0
  }
  const [r, c] = [gaps(rows), gaps(cols)]
  return c > 0.2 && c > 1.5 * r
}

// 픽셀 → 찾은 도형 네모 (이 그림 비율 0~1, 위에서 아래·왼쪽에서 오른쪽 차례). 글 줄이 가로인 그림에서 부른다 (누운 사진은 suggestShapes 가 거른다)
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
    const shaded = mx < paper[i] * TUNE.drop && mx > paper[i] * TUNE.dark && sat < 60 && !red
    // 밝은 노란 면은 R이 종이만큼 밝아 기존 마스크에서 윤곽만 남고 opening에서 사라졌다.
    // 채널 차이로 밝은 색칠을 보완하되 회색 종이·검은 글자와 붉은 채점은 제외한다.
    const redInk = red && g - b < 20
    const colored = mx > paper[i] * 0.7 && Math.min(r, g, b) < paper[i] * 0.92 && sat >= 25 && sat < 150 && !redInk
    mask[i] = shaded || colored ? 1 : 0
  }
  const k = Math.max(1, Math.round(Math.max(W, H) / 480)) // 줄인 크기 기준 걸음
  mask = dilate(erode(mask, W, H, TUNE.open * k), W, H, TUNE.open * k) // 작은 얼룩·글자 지우기 (빽빽한 글 줄은 줄이면 회색 띠가 된다)
  mask = erode(dilate(mask, W, H, 3 * k), W, H, 3 * k) // 점선·글자로 끊긴 면 잇기

  const ink = new Uint8Array(n) // 글자 (검정)
  // 줄이면 가는 글자가 회색이 되어(브라우저 실측) 곳마다 종이의 TUNE.ink 배보다 어두우면 글자로 본다. 색칠 면은 그보다 밝다
  for (let i = 0; i < n; i++) ink[i] = bright[i] < paper[i] * TUNE.ink && data[i * 4] - Math.max(data[i * 4 + 1], data[i * 4 + 2]) <= 40 ? 1 : 0
  const k0 = Math.max(1, Math.round(Math.max(W, H) / 480))
  const thick = dilate(erode(ink, W, H, 2 * k0), W, H, 2 * k0)
  const stroke = new Uint8Array(n) // 가는 획만 (글자). 진한 면·그림자처럼 두꺼운 검정은 뺀다
  for (let i = 0; i < n; i++) stroke[i] = ink[i] && !thick[i] ? 1 : 0
  const textAtBottom = bandInk(stroke, W, H, false) > 1.5 * bandInk(stroke, W, H, true) // 보통 문제 글은 위. 돌린 사진은 아래일 수 있다

  const { blobs, ids } = label(mask, W, H)
  const sharp = edgeSharpness(ids, blobs.length, bright, W, H)
  // 노란 면과 흰 종이는 R 최댓값이 비슷하다. 가장 어두운 채널의 경계도 확인한다.
  const low = new Uint8Array(n)
  for (let i = 0; i < n; i++) low[i] = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  const colorSharp = edgeSharpness(ids, blobs.length, low, W, H)
  // 인쇄된 그림은 테두리가 또렷하다. 그림자·조명 얼룩은 밝기가 서서히 바뀌어 테두리가 흐리다 (브라우저 실측 인쇄 14~61, 그림자 3.6~8.8)
  const found = blobs.filter((c, i) => c.area >= 0.01 * n && c.w >= 0.06 * Math.min(W, H) && c.h >= 0.06 * Math.min(W, H) && !onEdge(c, W, H, textAtBottom) && Math.max(sharp[i], colorSharp[i]) >= TUNE.sharp )
  // 둘레를 넓히고 (라벨 자리), 서로 닿은 것은 한 도형으로
  const raw = merge(found.map((c) => ({ x: c.x / W, y: c.y / H, w: c.w / W, h: c.h / H })))
  const boxes = raw.map((b) => stopAtText(pad(b, raw), b, ink, W, H))
  const mid = (b: PhotoBox) => b.y + b.h / 2 // 같은 줄(가운데 높이가 비슷)이면 왼쪽부터
  return boxes.sort((a, b) => (Math.abs(mid(a) - mid(b)) > 0.15 ? mid(a) - mid(b) : a.x - b.x)).slice(0, MAX)
}

// 사진의 problem 부분(사진 비율)에서 찾아 사진 비율 네모로. 실패하면 빈 목록. 사진이 누워 있으면 찾지 않고 sideways
export function suggestShapes(img: HTMLImageElement, problem: PhotoBox): { boxes: PhotoBox[]; sideways: boolean } {
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
    if (sideways(px)) return { boxes: [], sideways: true }
    const boxes = findShapeBoxes(px).map((b) => ({ x: problem.x + b.x * problem.w, y: problem.y + b.y * problem.h, w: b.w * problem.w, h: b.h * problem.h }))
    return { boxes, sideways: false }
  } catch {
    return { boxes: [], sideways: false }
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
function label(m: Uint8Array, W: number, H: number): { blobs: Blob[]; ids: Int32Array } {
  const ids = new Int32Array(m.length).fill(-1) // 픽셀 → 덩어리 번호
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
      ids[p] = blobs.length
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
  return { blobs, ids }
}

// 덩어리마다 테두리(밖과 닿은 픽셀)에서의 평균 밝기 변화 (가로·세로 이웃 차의 합)
function edgeSharpness(ids: Int32Array, count: number, v: Uint8Array, W: number, H: number): number[] {
  const sum = new Float64Array(count)
  const num = new Uint32Array(count)
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x
      const id = ids[p]
      if (id < 0 || (ids[p - 1] === id && ids[p + 1] === id && ids[p - W] === id && ids[p + W] === id)) continue
      const [l, r, u, d] = [y * W + Math.max(0, x - 2), y * W + Math.min(W - 1, x + 2), Math.max(0, y - 2) * W + x, Math.min(H - 1, y + 2) * W + x]
      sum[id] += Math.abs(v[r] - v[l]) + Math.abs(v[d] - v[u])
      num[id]++
    }
  return Array.from(sum, (s, i) => (num[i] ? s / num[i] : 0))
}

// 위·아래로 넓힌 자리에 문제 글 줄이 있으면 그 줄 앞에서 멈춘다. 한 줄에서 글자(검정)가 네모 폭의 12% 넘으면 글 줄로 본다
// (라벨 ㄱ·ㄴ 은 작아서 넘지 않는다)
function stopAtText(b: PhotoBox, core: PhotoBox, ink: Uint8Array, W: number, H: number): PhotoBox {
  const [x0, x1] = [Math.round(b.x * W), Math.min(W, Math.round((b.x + b.w) * W))]
  const isText = (y: number) => {
    let count = 0
    for (let x = x0; x < x1; x++) count += ink[y * W + x]
    return count > 0.12 * (x1 - x0)
  }
  let top = b.y
  for (let y = Math.round(core.y * H) - 1; y >= Math.round(b.y * H); y--)
    if (isText(y)) {
      top = (y + 2) / H
      break
    }
  let bottom = b.y + b.h
  for (let y = Math.round((core.y + core.h) * H); y < Math.min(H, Math.round((b.y + b.h) * H)); y++)
    if (isText(y)) {
      bottom = (y - 1) / H
      break
    }
  return { x: b.x, y: top, w: b.w, h: Math.max(core.y + core.h, bottom) - top }
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

// 페이지 그림자·제본 띠·위 문제의 남은 그림: 칸 위(글 쪽) 가장자리에 닿거나,
// 한 가장자리를 따라 60% 넘게 붙은 가는 띠. 문제 칸은 위에 문제 글, 아래에 그림이라 그림이 위 가장자리에 닿지 않는다
// (29번을 넉넉히 감싸면 위쪽 종이가 휘어 어두운 곳이 브라우저에서만 덩어리로 잡혔다)
// textAtBottom: 글이 아래쪽에 있으면(돌린 사진) 위 대신 아래 가장자리를 본다
function onEdge(c: { x: number; y: number; w: number; h: number }, W: number, H: number, textAtBottom = false): boolean {
  const e = 2
  const [left, top, right, bottom] = [c.x <= e, c.y <= e, c.x + c.w >= W - e, c.y + c.h >= H - e]
  const [textSide, figureSide] = textAtBottom ? [bottom, top] : [top, bottom]
  // 두 가장자리에 닿는 것만으로는 버리지 않는다: 문제 칸을 꼭 맞게 그리면 전개도가 오른쪽·아래에 같이 닿는다 (29번 회귀, #155)
  // 한 가장자리를 따라 길게 붙은 것은 가늘 때만 (그림자 띠는 폭 7% 쯤. 꼭 맞게 그린 전개도는 길게 닿아도 두껍다)
  return textSide || ((left || right) && c.h > 0.6 * H && c.w < 0.15 * W) || (figureSide && c.w > 0.6 * W && c.h < 0.15 * H)
}

// 위·아래 30% 띠의 글자 양 (top: 위 띠)
function bandInk(ink: Uint8Array, W: number, H: number, top: boolean): number {
  const [y0, y1] = top ? [0, Math.round(0.3 * H)] : [Math.round(0.7 * H), H]
  let s = 0
  for (let i = y0 * W; i < y1 * W; i++) s += ink[i]
  return s
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
