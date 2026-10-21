// TODO-1 실험: ShapeScene → GeoGebra 명령 변환, 전개도(Net) + 슬라이더에 선분이 따라오는지 확인.
// 서비스 코드가 아니다. 실험 기록으로만 남긴다 (최종 결정은 three.js, 플랜 B).
// 결과는 docs/reports/ 의 TODO-1 리포트 참고.
import { mockScene } from '../src/shared/mock'
import type { LinePoint, ShapeScene, VertexIndex } from '../src/shared/types'

declare const GGBApplet: any

// 꼭짓점 인덱스 → 좌표 (docs/02-specs.md 규칙. GeoGebra 는 z 가 위, 앞면은 y = 0)
function vertexCoord(i: number, { width, depth, height }: ShapeScene['size']) {
  return [[1, 2, 5, 6].includes(i) ? width : 0, [2, 3, 6, 7].includes(i) ? depth : 0, i >= 4 ? height : 0]
}

// 면 = 꼭짓점 4개 (docs/02-specs.md: 앞, 뒤, 위, 아래, 왼, 오)
const FACES: VertexIndex[][] = [
  [0, 1, 5, 4], [3, 2, 6, 7], [4, 5, 6, 7], [0, 1, 2, 3], [0, 3, 7, 4], [1, 2, 6, 5],
]
const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5', '#8e24aa', '#6d4c41']

// 실험용 장면: 목 데이터 + 모서리를 넘어가는 선(앞면 → 오른쪽 면, 모서리 1-5 에서 꺾임)을 두 조각으로
const scene: ShapeScene = {
  ...mockScene,
  lines: [
    ...mockScene.lines,
    { from: { edge: [0, 1], t: 0.5 }, to: { edge: [1, 5], t: 0.5 } },
    { from: { edge: [1, 5], t: 0.5 }, to: { edge: [2, 6], t: 0.5 } },
  ],
}

const log = (msg: string) => {
  document.getElementById('log')!.textContent += msg + '\n'
}

function build(api: any) {
  const names = () => new Set<string>(api.getAllObjectNames())
  const run = (cmd: string) => {
    if (!api.evalCommand(cmd)) throw new Error('GeoGebra 명령 실패: ' + cmd)
  }

  api.setValue('s', 0)
  const c = (i: number) => `(${vertexCoord(i, scene.size).join(',')})`
  for (let i = 0; i < 8; i++) run(`V_${i} = ${c(i)}`)

  // 밑면(전개도에서 고정되는 면)을 앞면으로, 첫 모서리를 오른쪽 면과 맞닿은 1-5 로 잡으면
  // 뒷면이 오른쪽 면에 붙어서 docs/02-specs.md 의 cross 배치가 된다
  const beforePrism = names()
  run('box = Prism(V_1, V_5, V_4, V_0, V_2)')
  const beforeNet = names()
  run('net = Net(box, s)')
  const netObjs = [...names()].filter((n) => !beforeNet.has(n))

  // 원래 직육면체와 꼭짓점은 숨긴다 (전개도만 보이게)
  for (const n of beforeNet) if (!beforePrism.has(n) || n.startsWith('V_')) api.setVisible(n, false)

  // s = 0 (접힌 상태)에서 좌표가 같은 원래 꼭짓점을 찾아 전개도 점 → 원래 꼭짓점 인덱스 대응을 만든다
  const orig = new Map<string, number>()
  for (const n of netObjs.filter((n) => api.getObjectType(n) === 'point')) {
    const p = [api.getXcoord(n), api.getYcoord(n), api.getZcoord(n)]
    const i = [...Array(8).keys()].find((i) => vertexCoord(i, scene.size).every((v, k) => Math.abs(v - p[k]) < 1e-9))
    orig.set(n, i!)
  }
  // 전개도 면: 면의 점 이름 목록 → 어느 원래 면인지
  const netFaces = netObjs
    .filter((n) => api.getObjectType(n) === 'quadrilateral')
    .map((n) => {
      // 예: "Polygon[D, E, I, H, net]" → [D, E, I, H]
      const pts = api.getCommandString(n, false).replace(/^[^[(]*[[(]|[\])]$/g, '').split(', ').slice(0, -1) as string[]
      const face = FACES.findIndex((f) => f.every((v) => pts.some((p) => orig.get(p) === v)))
      return { name: n, pts, face }
    })

  // 선분: 끝점을 "그 면의 전개도 점"으로 표현하면 펼칠 때 같이 움직인다
  const pointExpr = (p: LinePoint, pts: string[]) => {
    const at = (v: number) => pts.find((n) => orig.get(n) === v)!
    if ('vertex' in p) return at(p.vertex)
    const [a, b] = p.edge.map(at)
    return `${a} + ${p.t} (${b} - ${a})`
  }
  const endVerts = (p: LinePoint) => ('vertex' in p ? [p.vertex] : p.edge)
  scene.lines.forEach((line, k) => {
    const need = [...endVerts(line.from), ...endVerts(line.to)]
    const f = netFaces.find((nf) => need.every((v) => FACES[nf.face].includes(v as VertexIndex)))
    if (!f) return log(`선분 ${k}: 같은 면 위가 아님 → 건너뜀`)
    run(`line_${k} = Segment(${pointExpr(line.from, f.pts)}, ${pointExpr(line.to, f.pts)})`)
    api.setColor(`line_${k}`, 220, 0, 0)
    api.setLineThickness(`line_${k}`, 8)
  })

  // 비교용: 원래 직육면체 꼭짓점으로 그린 윗면 선 (line_1 과 같은 위치). 전개도를 따라오지 않는다
  run('naive = Segment((V_4 + V_5) / 2, (V_6 + V_7) / 2)')
  api.setColor('naive', 120, 120, 120)
  api.setLineStyle('naive', 1)

  // 꼭짓점 라벨: 같은 원래 꼭짓점의 전개도 복사본에 같은 라벨
  for (const [n, i] of orig) {
    const label = scene.vertexLabels[i]
    if (label) {
      api.setCaption(n, label)
      api.setLabelStyle(n, 3) // caption
      api.setLabelVisible(n, true)
    }
  }

  return { orig, netFaces }
}

function hex(h: string) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
}

new GGBApplet(
  {
    appName: '3d',
    width: document.getElementById('ggb')!.clientWidth,
    height: window.innerHeight,
    showToolBar: false,
    showAlgebraInput: false,
    showMenuBar: false,
    appletOnLoad: (api: any) => {
      api.setPerspective('T') // 3D 그래픽 화면만 (대수창 숨김)
      // 대수창을 숨긴 뒤와 창 크기가 바뀔 때 크기를 다시 맞춘다 (안 하면 그래픽이 일부만 그려짐)
      const fit = () => api.setSize(document.getElementById('ggb')!.clientWidth, window.innerHeight)
      fit()
      window.addEventListener('resize', fit)
      api.evalCommand('s = Slider(0, 1, 0.01)')
      api.setAxesVisible(3, false, false, false)
      api.setGridVisible(3, false)
      const { orig, netFaces } = build(api)
      // 접힌 상태와 펼친 상태가 모두 화면에 들어오게
      api.evalCommand('ZoomIn(-3, -1, -3, 11, 3, 6)')

      // JS → 슬라이더
      const range = document.getElementById('s') as HTMLInputElement
      const sv = document.getElementById('sv')!
      range.oninput = () => api.setValue('s', Number(range.value))
      // GeoGebra → 화면 (JS 에서 바꾼 값이 반영되는지 확인용)
      ;(window as any).onS = () => {
        range.value = String(api.getValue('s'))
        sv.textContent = api.getValue('s').toFixed(2)
      }
      api.registerObjectUpdateListener('s', 'onS')

      // JS → 꼭짓점 색: 같은 원래 꼭짓점의 복사본을 모두 같은 색으로
      const highlight = (v: number) => {
        for (const [n, i] of orig) {
          const on = v < 0 || i === v
          api.setColor(n, ...(on ? hex(COLORS[i]) : [200, 200, 200]))
          api.setPointSize(n, on ? 7 : 3)
        }
      }
      highlight(-1)
      let hl = false
      document.getElementById('hl')!.onclick = () => {
        hl = !hl
        highlight(hl ? 0 : -1)
      }

      document.getElementById('anim')!.onclick = () => {
        const t0 = performance.now()
        const step = () => {
          const t = Math.min(1, (performance.now() - t0) / 2000)
          api.setValue('s', t)
          if (t < 1) requestAnimationFrame(step)
        }
        step()
      }

      // 클릭 이벤트 → 어떤 원래 꼭짓점인지
      ;(window as any).onClickObj = (name: string) =>
        log(`클릭: ${name}${orig.has(name) ? ` → 꼭짓점 ${orig.get(name)}` : ''}`)
      api.registerClickListener('onClickObj')

      ;(window as any).lab = { api, orig: Object.fromEntries(orig), netFaces, highlight }
      ;(window as any).ready = true
    },
  },
  true,
).inject('ggb')
