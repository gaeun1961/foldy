// 책 장면 (docs/specs/viewer.md "책 장면"): 나무 책상 · 데스크 매트 · 펼친 책. 바닥(y = 0)이 오른쪽 페이지라서
// 전개도가 페이지 위에 눕고, 접으면 페이지에서 일어선다. 이미지 파일 없이 상자·평면과 캔버스 텍스처로만 만든다
import { buildDeskProps } from './deskProps.ts'
import { colorTokens } from './lessons/formulas.ts'
import * as THREE from 'three'

// 색은 docs/specs/ui.md 색 기준 "3D 뷰 배경"
export const DESK_COLOR = '#c9a983' // 나무 책상 (index.css --desk 와 같게, ui.md 컨셉)
// 책 장면 카메라 방향: 위에서 내려다본다 (수평에서 62°). 왼쪽 쪽 글씨가 덜 기울어지게.
// 순서가 없는 도형(정다면체·각뿔)을 눕히는 방향(facingYaw)과 접는 순서(farFirstOrder)도 이 방향으로 정한다. 홀로그램 무대(stage.ts)도 같은 값을 써서 같은 순서로 접힌다
export const VIEW_DIR = new THREE.Vector3(0.3, 1.96, 1)
const COVER_COLOR = '#b08d57' // 차분한 황토
const PAPER_COLOR = '#faf6ee' // 따뜻한 미색
const PAPER_EDGE = '#efe8da'
export const INK = '#2f2a25'
const PAGE_SCALE = 2
const ANSWER = '#e0442e' // 최종 답만 빨강
const RESULT_FILL = '#fbecb8' // 결과 칸: 노랑 색연필로 칠한 형광펜
export const PENCILS = ['#e0442e', '#2f6fd0', '#2e9e4f', '#f5c518'] // 화면의 강조색 전부 (ui.md 컨셉). 펜으로 그려 내기의 펜도 초록을 쓴다 (penDraw.ts)
export const PENCIL_WOOD = '#e8d3ae' // 색연필 깎은 나무

// 매트: 밝기를 비교하는 임시 토글 때문에 하나를 같이 쓴다 (ui.md 컨셉). 정해지면 상수로
const matMaterial = new THREE.MeshStandardMaterial({ color: '#4d4945', roughness: 0.9 })
export const setMatColor = (color: string) => matMaterial.color.set(color)
export const FONT = "'Pretendard Variable', Pretendard, system-ui, sans-serif"

// 빈 책 오른쪽 쪽의 차례 한 줄 (viewer.md "빈 책")
// 공식 결과: 왼쪽 쪽에서 한 줄 설명 자리에 식과 값을 찍는다
// value 없음: 교과서에서 계산하지 않는 값이라 식만. table: 표 (이름, 값) 열
// general: 일반 공식 (글자별 색). reveal: 지금까지 나타난 줄 수 (일반 공식 → 숫자 식 → 답, 자리는 처음부터 잡아 둔다)
// lines: 글자별 색으로 쓰는 설명 줄들 (한 줄씩 reveal), link 는 그 줄 옆의 작은 링크 (왼쪽 쪽 메뉴처럼 누른다)
export type BookResult = { formula: string; value?: string; table?: string[][]; general?: string; ratios?: { label: string; value: string; note: string }[]; reveal?: number; lines?: { text: string; link?: { id: string; label: string } }[] }
// 왼쪽 쪽 메뉴 한 줄 (viewer.md "책 장면"). 누르면 onPageMenu(id)
export type BookMenuItem = { id: string; label: string; active: boolean; enabled: boolean }
export type BookContent = { title: string; page: number | null } // page: 그 도형의 왼쪽 쪽 번호, 아직 없는 도형이면 null

// 종이 한 장의 윗면: 종이색 + 책등 쪽 그늘 + (왼쪽 페이지) 글자 / (오른쪽, 빈 책) 차례. 캔버스 위쪽이 책의 먼 쪽(−z).
// 차례를 그리면 줄마다 캔버스 위 세로 범위(0 = 위, 1 = 아래)를 rows 에 담는다 (누른 줄 찾기)
export function pageTexture(pageW: number, pageD: number, side: 'left' | 'right', text: string[], contents: BookContent[] = [], rows: { top: number; bottom: number }[] = [], pageNumber?: number, result?: BookResult, menu: BookMenuItem[] = [], menuRows: { id: string; top: number; bottom: number; enabled: boolean }[] = []) {
  const canvas = document.createElement('canvas')
  // 글자가 뭉개지지 않게 실제 그림은 PAGE_SCALE 배로 그린다. 아래 좌표와 글자 크기는 가로 1024 기준 그대로
  const [w, h] = [1024, Math.round((1024 * pageD) / pageW)]
  canvas.width = w * PAGE_SCALE
  canvas.height = h * PAGE_SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(PAGE_SCALE, PAGE_SCALE)
  ctx.fillStyle = PAPER_COLOR
  ctx.fillRect(0, 0, w, h)
  // 책등 쪽으로 갈수록 어둡게 (페이지가 안으로 말려 들어가는 그늘)
  const spine = side === 'left' ? w : 0
  const shade = ctx.createLinearGradient(spine, 0, side === 'left' ? w * 0.86 : w * 0.14, 0)
  shade.addColorStop(0, 'rgb(120 100 70 / 28%)')
  shade.addColorStop(1, 'rgb(120 100 70 / 0%)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#9a9184'
  ctx.font = `28px ${FONT}`
  ctx.textAlign = side === 'left' ? 'left' : 'right'
  if (pageNumber !== undefined) ctx.fillText(String(pageNumber), side === 'left' ? w * 0.08 : w * 0.92, h * 0.95) // 쪽 번호 (바깥 아래 귀퉁이)
  if (side === 'right') {
    if (!contents.length) return finish(canvas)
    const x = w * 0.12
    const right = w * 0.88
    let y = h * 0.14
    ctx.textAlign = 'left'
    ctx.fillStyle = INK
    ctx.font = `bold 30px ${FONT}`
    ctx.fillText('CONTENTS', x, y)
    y += 90
    ctx.fillStyle = INK
    ctx.font = `bold 76px ${FONT}`
    ctx.fillText('차례', x, y)
    y += 40
    ctx.fillStyle = '#cfc6b6'
    ctx.fillRect(x, y, right - x, 3)
    y += 110
    const step = Math.min(104, (h * 0.9 - y) / contents.length) // 줄이 많아도 쪽 번호 위에서 끝나게
    contents.forEach(({ title, page }, k) => {
      const ready = page !== null
      ctx.textAlign = 'left'
      ctx.fillStyle = ready ? INK : '#c9c0b0'
      ctx.font = `bold 44px ${FONT}`
      ctx.fillText(String(k + 1), x, y)
      ctx.fillStyle = ready ? INK : '#b5ad9f'
      ctx.font = `600 48px ${FONT}`
      ctx.fillText(title, x + 70, y, right - x - 300)
      const titleEnd = x + 70 + Math.min(ctx.measureText(title).width, right - x - 300)
      ctx.textAlign = 'right'
      if (ready) {
        ctx.font = `44px ${FONT}`
        ctx.fillStyle = INK
        ctx.fillText(String(page), right, y)
        // 제목과 쪽 번호 사이 점선 (차례 줄)
        ctx.fillStyle = '#b9b0a0'
        for (let dx = titleEnd + 24; dx < right - 60; dx += 18) ctx.fillRect(dx, y - 8, 4, 4)
      } else {
        ctx.font = `34px ${FONT}`
        ctx.fillStyle = '#c9c0b0'
        ctx.fillText('곧 나와요', right, y)
      }
      rows.push({ top: (y - step * 0.6) / h, bottom: (y + step * 0.33) / h })
      y += step
    })
    return finish(canvas)
  }
  if (text.length === 0) return finish(canvas)

  const x = w * 0.12
  const maxWidth = w * 0.74
  let y = h * 0.14
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `bold 30px ${FONT}`
  ctx.fillText('입체도형 · 전개도', x, y)
  y += 90
  ctx.fillStyle = INK
  ctx.font = `bold 76px ${FONT}`
  ctx.fillText(text[0], x, y, maxWidth)
  y += 40
  ctx.fillStyle = '#cfc6b6'
  ctx.fillRect(x, y, maxWidth, 3)
  y += 70
  ctx.fillStyle = INK
  ctx.font = `600 42px ${FONT}`
  for (const line of text.slice(1)) {
    for (const row of wrap(ctx, line, maxWidth)) {
      drawMath(ctx, row, x, y)
      y += 64
    }
    y += 24
  }
  if (result?.lines) {
    const rowHeight = 58
    const font = `600 38px ${FONT}`
    const linkFont = `bold 30px ${FONT}`
    ctx.font = font
    // 먼저 줄을 나눠 자리를 잡는다: 글이 나타나도 메뉴가 움직이지 않게
    const laid = result.lines.map((line) => {
      const rows = wrap(ctx, line.text, maxWidth)
      ctx.font = linkFont
      const linkWidth = line.link ? ctx.measureText(line.link.label).width + 24 : 0
      ctx.font = font
      const inline = !line.link || drawMath(ctx, rows[rows.length - 1], x, y, false, false) + linkWidth <= maxWidth
      return { ...line, rows, linkWidth, inline }
    })
    const reveal = result.reveal ?? laid.length
    const total = laid.reduce((sum, l) => sum + (l.rows.length + (l.inline ? 0 : 1)) * rowHeight + 10, 0)
    if (reveal > 0) {
      ctx.fillStyle = RESULT_FILL
      ctx.beginPath()
      ctx.roundRect(x - 24, y - 46, maxWidth + 48, total + 16, 16)
      ctx.fill()
    }
    laid.forEach((line, k) => {
      const on = k < reveal
      for (const row of line.rows) {
        if (on) {
          ctx.font = font
          ctx.fillStyle = INK
          drawMath(ctx, row, x, y, true)
        }
        y += rowHeight
      }
      if (line.link) {
        if (line.inline) y -= rowHeight
        if (on) {
          ctx.font = linkFont
          ctx.fillStyle = INK
          const linkX = x + maxWidth - line.linkWidth + 24
          ctx.fillText(line.link.label, linkX, y)
          ctx.fillRect(linkX, y + 6, line.linkWidth - 24, 2)
          menuRows.push({ id: line.link.id, top: (y - 40) / h, bottom: (y + 14) / h, enabled: true })
        }
        y += rowHeight
      }
      y += 10
    })
  } else if (result?.table) {
    const columns = result.table
    const width = maxWidth / columns.length
    ctx.fillStyle = RESULT_FILL
    ctx.beginPath()
    ctx.roundRect(x - 24, y - 52, maxWidth + 48, 232, 16)
    ctx.fill()
    ctx.textAlign = 'center'
    columns.forEach(([name, value], k) => {
      const middle = x + width * (k + 0.5)
      ctx.fillStyle = INK
      ctx.font = `600 42px ${FONT}`
      ctx.fillText(name, middle, y, width)
      ctx.fillStyle = ANSWER
      ctx.font = `bold 84px ${FONT}`
      ctx.fillText(value, middle, y + 120, width)
    })
    ctx.textAlign = 'left'
    ctx.fillStyle = '#cfc6b6'
    ctx.fillRect(x, y + 22, maxWidth, 3)
    for (let k = 1; k < columns.length; k++) ctx.fillRect(x + width * k, y - 40, 3, 200)
    y += 200
  } else if (result) {
    ctx.font = `600 42px ${FONT}`
    const rows = wrap(ctx, result.formula, maxWidth)
    let line = 0
    const shown = () => ++line <= (result.reveal ?? 3)
    // 형광펜: 식과 값 뒤를 칠해 눈에 띄게
    ctx.fillStyle = RESULT_FILL
    ctx.beginPath()
    ctx.roundRect(x - 24, y - 52, maxWidth + 48, (result.general ? 76 : 0) + rows.length * 64 + (result.value ? 148 : 16) + (result.ratios?.length ?? 0) * 96, 16)
    ctx.fill()
    if (result.general) {
      if (shown()) {
        // 글자별 색. 넘치면 줄여서 한 줄에
        ctx.font = `bold 46px ${FONT}`
        const fit = Math.min(1, maxWidth / drawMath(ctx, result.general, x, y, true, false))
        ctx.font = `bold ${46 * fit}px ${FONT}`
        ctx.fillStyle = INK
        drawMath(ctx, result.general, x, y, true)
        ctx.font = `600 42px ${FONT}`
      }
      y += 76
    }
    ctx.fillStyle = INK
    const showFormula = shown()
    for (const row of rows) {
      if (showFormula) drawMath(ctx, row, x, y)
      y += 64
    }
    // 같은 크기로 강조하는 줄들: 이름, 큰 값, 작은 계산값
    for (const { label, value, note } of result.ratios ?? []) {
      y += 30
      if (shown()) {
        ctx.fillStyle = INK
        ctx.font = `600 42px ${FONT}`
        ctx.fillText(label, x, y)
        ctx.fillStyle = ANSWER
        ctx.font = `bold 76px ${FONT}`
        ctx.fillText(value, x + 200, y)
        const end = x + 200 + ctx.measureText(value).width + 24
        ctx.fillStyle = INK
        ctx.font = `600 38px ${FONT}`
        ctx.fillText(note, end, y)
      }
      y += 66
    }
    if (result.value) {
      y += 40
      ctx.fillStyle = ANSWER
      ctx.font = `bold 84px ${FONT}`
      if (shown()) ctx.fillText(result.value, x, y, maxWidth)
      y += 40
    }
  }
  // 메뉴: 글 아래 한 줄씩. 고른 줄은 굵게 + 표시, 못 고르는 줄은 흐리게 (색만으로 구분하지 않기)
  if (menu.length) {
    y = Math.max(y + 70, h * 0.42)
    ctx.fillStyle = '#cfc6b6'
    ctx.fillRect(x, y - 62, maxWidth, 3)
    y += 10
    for (const { id, label, active, enabled } of menu) {
      ctx.font = `${active ? 'bold' : '600'} 54px ${FONT}`
      ctx.fillStyle = !enabled ? '#b5ad9f' : INK
      ctx.fillText(`${active ? '▸ ' : ''}${label}`, x, y, maxWidth)
      menuRows.push({ id, top: (y - 60) / h, bottom: (y + 24) / h, enabled })
      y += 84
    }
  }
  return finish(canvas)
}

// 띄어쓰기 단위로 줄을 나눈다
// 수식 글자를 쓴다. 분수(⅓ ⅔ ⁴⁄₃)는 글꼴에서 작게 뭉개져서 위아래로 직접 그린다. colored: 글자별 색. 돌려주는 값은 쓴 너비 (draw = false 면 재기만)
const FRACTIONS: Record<string, [string, string]> = { '⅓': ['1', '3'], '⅔': ['2', '3'], '⁴⁄₃': ['4', '3'] }
function drawMath(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colored = false, draw = true) {
  const font = ctx.font
  const ink = ctx.fillStyle
  const px = parseFloat(/([\d.]+)px/.exec(font)![1])
  const smallFont = font.replace(/[\d.]+px/, `${px * 0.68}px`)
  let at = x
  for (const part of text.split(/(⅓|⅔|⁴⁄₃)/).filter(Boolean)) {
    const fraction = FRACTIONS[part]
    if (fraction) {
      ctx.fillStyle = ink
      ctx.font = smallFont
      const width = Math.max(...fraction.map((n) => ctx.measureText(n).width)) + px * 0.24
      if (draw) {
        const bar = y - px * 0.3
        fraction.forEach((n, k) => ctx.fillText(n, at + (width - ctx.measureText(n).width) / 2, k === 0 ? bar - px * 0.08 : bar + px * 0.58))
        ctx.fillRect(at + px * 0.04, bar, width - px * 0.08, Math.max(2, px * 0.05))
      }
      ctx.font = font
      at += width + px * 0.06
      continue
    }
    for (const { text: piece, color } of colored ? colorTokens(part) : [{ text: part, color: undefined }]) {
      ctx.fillStyle = color ?? ink
      if (draw) ctx.fillText(piece, at, y)
      at += ctx.measureText(piece).width
    }
  }
  ctx.fillStyle = ink
  return at - x
}

function wrap(ctx: CanvasRenderingContext2D, line: string, maxWidth: number) {
  const rows: string[] = []
  let row = ''
  for (const word of line.split(' ')) {
    const next = row ? `${row} ${word}` : word
    if (row && ctx.measureText(next).width > maxWidth) {
      rows.push(row)
      row = word
    } else row = next
  }
  return [...rows, row]
}

function finish(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16 // 비스듬히 봐도 글자가 뭉개지지 않게 (그래픽 카드 한도까지)
  return texture
}

// 종이 단면: 종이가 여러 장 쌓인 가는 가로줄. 상자 옆면은 텍스처 v 가 높이 방향이라 네 옆면에 같이 쓴다
function edgeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PAPER_EDGE
  ctx.fillRect(0, 0, 4, 128)
  let seed = 3
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) // 매번 같은 무늬
  // 화면에서 단면은 몇십 픽셀이라 줄이 촘촘하면 한 색으로 뭉개진다. 열 몇 장만, 굵은 진한 줄 + 밝은 줄로.
  // 밉맵은 켜 둔다: 끄면 축소했을 때 줄이 지그재그로 깨진다
  for (let y = 2; y < 128; y += 8 + Math.floor(rand() * 4)) {
    ctx.fillStyle = `rgb(110 90 60 / ${45 + rand() * 25}%)`
    ctx.fillRect(0, y, 4, 2)
    ctx.fillStyle = 'rgb(255 255 255 / 55%)'
    ctx.fillRect(0, y + 2, 4, 2)
  }
  return finish(canvas)
}

// 옅은 나뭇결: 책상색 바탕에 가로로 긴 줄
function woodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = DESK_COLOR
  ctx.fillRect(0, 0, 512, 512)
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) // 매번 같은 무늬
  for (let k = 0; k < 50; k++) {
    ctx.strokeStyle = rand() < 0.5 ? 'rgb(90 60 30 / 12%)' : 'rgb(255 225 190 / 10%)'
    ctx.lineWidth = 1 + rand() * 2
    const y = rand() * 512
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(170, y + (rand() - 0.5) * 12, 340, y + (rand() - 0.5) * 12, 512, y)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

// net: 다 펼친 전개도의 범위(y ≈ 0), size: 도형 크기(카메라 범위 반지름), pageText: 왼쪽 페이지 글 (첫 줄 제목),
// contents: 빈 책이면 오른쪽 쪽 차례 (viewer.md "빈 책"), pageNumbers: 왼쪽·오른쪽 쪽 번호 (없으면 찍지 않음)
export function buildBook(net: THREE.Box3, size: number, pageText: string[], contents: BookContent[] = [], pageNumbers?: [number, number], result?: BookResult, menu: BookMenuItem[] = []) {
  const group = new THREE.Group()
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(own(geometry), material)
    mesh.position.set(x, y, z)
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  const w = net.max.x - net.min.x
  const d = net.max.z - net.min.z
  const margin = Math.max(w, d) * 0.15
  const pageW = w + 2 * margin
  const pageD = Math.max(d + 2 * margin, pageW * 1.3)
  const cx = (net.min.x + net.max.x) / 2
  const cz = (net.min.z + net.max.z) / 2
  const spineX = cx - pageW / 2 // 책등: 오른쪽 페이지의 왼쪽 끝
  const top = -size * 0.01 // 페이지 윗면. 전개도(y = 0)와 겹쳐 깜빡이지 않게 조금 아래 (0.3% 는 먼 쪽 면에서 줄무늬가 졌다)
  const thick = Math.max(w, d) * 0.04 // 종이 묶음 두께
  const coverT = thick * 0.35
  const coverMargin = margin * 0.25
  const matT = thick * 0.15

  // 책등 쪽 골: 책등에서 curl 안쪽만 아래로 말려 들어간다. 전개도는 책등에서 margin 이상 떨어져 있어 평평한 곳에만 놓인다
  const curl = margin * 0.9
  const dip = thick * 0.8
  const sag = (s: number) => (s < curl ? -dip * (1 - s / curl) ** 2 : 0) // s: 책등에서 떨어진 거리

  // 종이 두 장: 윗면은 페이지 텍스처, 옆면은 종이 단면. BoxGeometry 재질 순서 +x, −x, +y, −y, +z, −z
  // 가로로 잘게 나눈 상자의 위쪽 꼭짓점을 sag 만큼 내려 윗면과 앞뒤 단면이 함께 휜다
  const edge = own(new THREE.MeshStandardMaterial({ map: own(edgeTexture()) }))
  const rows: { top: number; bottom: number }[] = []
  let rightPage: THREE.Mesh | null = null
  let leftPage: THREE.Mesh | null = null
  const menuRows: { id: string; top: number; bottom: number; enabled: boolean }[] = []
  for (const side of ['left', 'right'] as const) {
    const face = own(new THREE.MeshStandardMaterial({ map: own(pageTexture(pageW, pageD, side, pageText, contents, rows, pageNumbers?.[side === 'left' ? 0 : 1], result, side === 'left' ? menu : [], menuRows)) }))
    const x = side === 'left' ? spineX - pageW / 2 : spineX + pageW / 2
    const geometry = new THREE.BoxGeometry(pageW, thick, pageD, 48, 1, 1)
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0) continue
      const s = side === 'left' ? pageW / 2 - pos.getX(i) : pos.getX(i) + pageW / 2
      pos.setY(i, pos.getY(i) + sag(s))
    }
    geometry.computeVertexNormals()
    const page = add(geometry, [edge, edge, face, edge, edge, edge], x, top - thick / 2, cz)
    page.castShadow = true
    if (side === 'right') rightPage = page
    else leftPage = page
  }

  // 표지: 종이보다 조금 크게, 종이 아래. 오프닝에서 왼쪽 반이 책등을 축으로 돌아 덮이므로 책등에서 둘로 나눈다
  const cover = own(new THREE.MeshStandardMaterial({ color: COVER_COLOR, roughness: 0.8 }))
  const coverY = top - thick - coverT / 2
  const coverW = pageW + coverMargin
  const [leftCover, rightCover] = [-1, 1].map((s) => add(new THREE.BoxGeometry(coverW, coverT, pageD + 2 * coverMargin), cover, spineX + (s * coverW) / 2, coverY, cz))
  leftCover.castShadow = rightCover.castShadow = true

  // 데스크 매트와 책상
  const matTop = coverY - coverT / 2
  const matW = (2 * pageW + 2 * coverMargin) * 1.32
  const matD = (pageD + 2 * coverMargin) * 1.15
  const matShape = new THREE.Shape()
  const matR = matD * 0.04
  const [halfW, halfD] = [matW / 2, matD / 2]
  matShape.moveTo(-halfW + matR, -halfD)
  matShape.lineTo(halfW - matR, -halfD)
  matShape.quadraticCurveTo(halfW, -halfD, halfW, -halfD + matR)
  matShape.lineTo(halfW, halfD - matR)
  matShape.quadraticCurveTo(halfW, halfD, halfW - matR, halfD)
  matShape.lineTo(-halfW + matR, halfD)
  matShape.quadraticCurveTo(-halfW, halfD, -halfW, halfD - matR)
  matShape.lineTo(-halfW, -halfD + matR)
  matShape.quadraticCurveTo(-halfW, -halfD, -halfW + matR, -halfD)
  const matMesh = add(new THREE.ExtrudeGeometry(matShape, { depth: matT, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -matT / 2, 0), matMaterial, spineX, matTop - matT / 2, cz)
  matMesh.receiveShadow = true
  // 색연필 네 자루: 책 오른쪽 옆 매트 위에 비스듬히. 육각 기둥 + 깎인 끝 (ui.md 컨셉)
  const pencilR = pageD * 0.012
  const pencilL = pageD * 0.55
  const woodTip = own(new THREE.MeshStandardMaterial({ color: PENCIL_WOOD }))
  const pencilX = spineX + pageW + coverMargin + (halfW - pageW - coverMargin) / 2
  PENCILS.forEach((color, k) => {
    const paint = own(new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
    const pencil = new THREE.Group()
    const body = new THREE.Mesh(own(new THREE.CylinderGeometry(pencilR, pencilR, pencilL, 6)), paint)
    const tip = new THREE.Mesh(own(new THREE.ConeGeometry(pencilR, pencilR * 3, 6)), woodTip)
    tip.position.y = pencilL / 2 + pencilR * 1.5
    const core = new THREE.Mesh(own(new THREE.ConeGeometry(pencilR * 0.35, pencilR * 1.05, 6)), paint)
    core.position.y = pencilL / 2 + pencilR * 2.48
    body.castShadow = true
    tip.castShadow = true
    pencil.add(body, tip, core)
    pencil.rotation.set(Math.PI / 2, 0, -0.14 + k * 0.05)
    pencil.position.set(pencilX + (k - 1.5) * pencilR * 3.4, matTop + pencilR, cz + (k - 1.5) * pencilR * 2)
    group.add(pencil)
  })
  // 책상 위 소품: 주사위·컴퍼스·삼각자·시계·필통·지우개 (deskProps.ts)
  group.add(buildDeskProps({ spineX, cz, pageD, bookHalfW: pageW + coverMargin, bookHalfD: pageD / 2 + coverMargin, matHalfW: halfW, matHalfD: halfD, matTop, deskY: matTop - matT, pencilX }, own))
  const wood = own(woodTexture())
  const deskSize = size * 60
  wood.repeat.set(deskSize / (size * 3), deskSize / (size * 3))
  const desk = add(new THREE.PlaneGeometry(deskSize, deskSize), own(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 })), spineX, matTop - matT, cz)
  desk.rotation.x = -Math.PI / 2

  return {
    group,
    center: new THREE.Vector3(spineX, 0, cz), // 펼친 책의 가운데 (책등 위)
    textCorner: new THREE.Vector3(spineX - pageW * 0.88, 0, cz - pageD * 0.42), // 왼쪽 쪽 글이 시작하는 곳. 공식 결과를 보여 줄 때 카메라가 담는다
    top, // 페이지 윗면 높이 (평평한 곳)
    page: { w: pageW, d: pageD }, // 한 쪽 크기 (오프닝에서 넘기는 종이)
    leftCover, // 표지 왼쪽 반 (오프닝에서 책을 덮었다 펼친다)
    thick, // 종이 묶음 두께
    gutter: { curl, dip }, // 책등 골: 책등에서 curl 안쪽이 dip 만큼 말려 들어간다 (오프닝의 넘기는 종이가 여기서 올라온다)
    // 빈 책: 광선이 맞힌 곳이 오른쪽 쪽 차례의 몇 번째 줄인가 (윗면 텍스처 v 는 위쪽이 1). 아니면 null
    contentAt: (hit: THREE.Intersection | undefined) => {
      if (!hit || hit.object !== rightPage || hit.face?.materialIndex !== 2 || !hit.uv) return null
      const v = 1 - hit.uv.y
      const k = rows.findIndex((r) => v >= r.top && v <= r.bottom)
      return k < 0 ? null : k
    },
    pages: () => (rightPage ? [rightPage] : []),
    leftPage: () => leftPage,
    // 광선이 맞힌 곳이 왼쪽 쪽 메뉴의 어느 줄인가 (고를 수 있는 줄만). 아니면 null
    menuAt: (hit: THREE.Intersection | undefined) => {
      if (!hit || hit.object !== leftPage || hit.face?.materialIndex !== 2 || !hit.uv) return null
      const v = 1 - hit.uv.y
      return menuRows.find((r) => r.enabled && v >= r.top && v <= r.bottom)?.id ?? null
    },
    dispose: () => owned.forEach((x) => x.dispose()),
  }
}

// 빈 책 구도 (EmptyBook): 펼친 두 쪽이 다 들어오게. 가로로 긴 화면은 아래 바가 위에 떠 있어서 보는 점을 앞으로 옮긴다
// 반지름은 쪽 너비에 비례한다 (빈 책 쪽 너비 7.8 에서 8.5). 그래서 책 크기가 달라도 화면에 같은 크기로 보인다
export function wholeBookView(book: { center: THREE.Vector3; page: { w: number } }, camera: THREE.PerspectiveCamera) {
  const radius = (book.page.w * 8.5) / 7.8
  const vfov = THREE.MathUtils.degToRad(camera.fov)
  const fov = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect))
  return { target: book.center.clone().add(new THREE.Vector3(0, 0, camera.aspect > 1.1 ? radius * 0.2 : 0)), distance: (radius / Math.sin(fov / 2)) * 1.05 }
}

// 차례에서 넘어왔을 때 (TODO-44): 빈 책 구도에서 이 화면 구도로 다가간다. 보는 방향은 그대로, 보는 점과 거리만.
// 화면 구도를 잡은(resize) 직후에 만들고, 구도를 다시 잡을 때마다 sync, 프레임마다 step. 다가가는 동안 돌리기는 꺼 둔다
const GLIDE_SECONDS = 0.9
export function bookGlide(book: { center: THREE.Vector3; page: { w: number } }, camera: THREE.PerspectiveCamera, controls: { target: THREE.Vector3; enabled: boolean }) {
  const end = { target: controls.target.clone(), position: camera.position.clone() }
  const from = wholeBookView(book, camera)
  let start = -1
  controls.enabled = false
  const sync = () => {
    end.target.copy(controls.target)
    end.position.copy(camera.position)
  }
  const step = (now: number) => {
    if (start < 0) start = now
    const u = Math.min(1, (now - start) / (GLIDE_SECONDS * 1000))
    const p = 1 - (1 - u) ** 3 // 빨리 출발해 천천히 자리 잡는다
    const dir = end.position.clone().sub(end.target)
    const distance = from.distance + (dir.length() - from.distance) * p
    controls.target.lerpVectors(from.target, end.target, p)
    camera.position.copy(controls.target).addScaledVector(dir.normalize(), distance)
    if (u >= 1) controls.enabled = true
    return u < 1
  }
  controls.target.copy(from.target)
  camera.position.copy(from.target).addScaledVector(end.position.clone().sub(end.target).normalize(), from.distance)
  return { sync, step }
}
