// 설명 모드 검사: 부피 조각 배치와 단계 수, 공식. 실행: `npm test` (= node src/viewer/lessons/lessons.test.ts)
import type { ShapeScene } from '../../shared/types.ts'
import { NET_VARIANTS, netVariant } from '../gridNet.ts'
import { polyhedronOf } from '../polyhedra.ts'
import { boxCenterOf, boxSizeOf, CONE_THIRD_LINK, lessonGrade, lessonHint, lessonNote, lessonStepCount, lessonSummary, lessonTabs, sphereSectionLines } from './data.ts'
import { defaultEdge, edgeRelations, edgesOf, meetPoint } from './edgeRelationsLayout.ts'
import { diagonalLayout, shortestRoutes } from './pythagorasLayout.ts'
import { similarLayout, similarSteps } from './similarLayout.ts'
import { curvedSurfaceSteps, stripIndex, unrollChain, faceArea, faceNormal, oppositeFacePairs, surfaceGroups, surfaceStepHint, surfaceSteps, tileCells, tileFormula } from './surfaceLayout.ts'
import { slantPlan, surd } from './regularLayout.ts'
import { boxLengthLabels, computedLengthText, faceLengthLabels, piValue, slantText } from './lengthLabels.ts'
import { colorTokens, generalFormula, LENGTH_COLOR, SECTION_RADIUS_COLOR } from './formulas.ts'
import { curvedTerms, polyTerms, revolutionTerms } from './lessonTerms.ts'
import { pourState } from './pour.ts'
import { heightOf, profileOf, sectionName, sectionStrips } from './revolveLayout.ts'
import { polySectionName, polySectionPoints } from './polySection.ts'
import { revolutionMeasure } from './regularLayout.ts'
import type { RevolutionSize } from '../../shared/types.ts'
import { cubePyramids, layerProgress, STAIR_LAYERS, stackProgress, stairRatio, volumeLayout } from './volumeLayout.ts'

const EPS = 1e-9
const round0 = (shape: string) => ({ shape, size: { radius: 3, height: 4 }, vertexLabels: shape === 'cone' ? [null] : [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error('실패: ' + msg)
}

// 정수 치수: 조각이 모두 1 이고 개수 = 부피
{
  const { cubes, layers, perLayer } = volumeLayout(4, 2, 3)
  check(layers === 3 && perLayer === 8 && cubes.length === 24, '4×2×3 은 3 층, 층마다 8 개, 모두 24 개')
  check(cubes.every((c) => c.sx === 1 && c.sy === 1 && c.sz === 1), '정수 치수는 조각이 모두 1')
  check(cubes.every((c) => Math.abs(c.x) <= 2 && Math.abs(c.y) <= 1.5 && Math.abs(c.z) <= 1), '조각이 직육면체 안에 있음')
  check(cubes.filter((c) => c.layer === 0).every((c, i) => c.index === i), '층 안 순서가 0 부터 차례로')
}

// 정수가 아닌 치수: 마지막 조각이 남는 길이만큼 얇고, 조각 부피의 합 = 가로×세로×높이
{
  const { cubes, layers, perLayer } = volumeLayout(2.5, 1, 1.5)
  check(layers === 2 && perLayer === 3 && cubes.length === 6, '2.5×1×1.5 는 2 층, 층마다 3 개')
  const total = cubes.reduce((s, c) => s + c.sx * c.sy * c.sz, 0)
  check(Math.abs(total - 3.75) < EPS, `조각 부피 합 3.75, 실제 ${total}`)
  check(cubes.some((c) => Math.abs(c.sx - 0.5) < EPS) && cubes.some((c) => Math.abs(c.sy - 0.5) < EPS), '0.5 짜리 조각이 있음')
}

// 진행률 → 층마다 진행률: 단계별 접기와 같은 칸 나누기
{
  const p = layerProgress(3, 0.5)
  check(p[0] === 1 && Math.abs(p[1] - 0.5) < EPS && p[2] === 0, `0.5 → [1, 0.5, 0], 실제 ${p}`)
  check(layerProgress(3, 0).every((q) => q === 0) && layerProgress(3, 1).every((q) => q === 1), '0 과 1 은 전부 0 / 전부 1')
  check(stackProgress(3, 0.25).base === 1 && stackProgress(3, 0.25).layersP === 0 && stackProgress(3, 1).layersP === 1, '밑면을 다 칠한 뒤에 층이 쌓인다')
}

// 단계 수와 공식
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const cube: ShapeScene = { shape: 'cube', size: { edge: 2.5 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const cylinder: ShapeScene = { shape: 'cylinder', size: { radius: 1, height: 2 }, vertexLabels: [], lines: [], net: { layout: 'default' } }
  check(lessonStepCount(cuboid, 'volume') === 4 && lessonStepCount(cube, 'volume') === 4, '단계 = 밑면 + 층 수(높이를 올림한 값)')
  check(lessonStepCount(cylinder, 'volume') === 3, '원기둥 단계 = 밑면 + 높이')
  const s = lessonSummary(cuboid, 'volume')!
  check(s.formula === '4 × 2 × 3' && s.general === 'abc' && s.value === '24 cm³', `공식 문구, 실제 ${s.formula} = ${s.value}`)
  check(lessonSummary(cube, 'volume')!.value === '15.63 cm³', '소수는 둘째 자리까지')
}

// 겉넓이: 마주 보는 면 쌍 3개 (앞·뒤, 왼·오, 위·아래), 면 넓이, 공식
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const poly = polyhedronOf(cuboid)!
  const pairs = oppositeFacePairs(poly)
  check(JSON.stringify(pairs) === '[[0,5],[1,2],[3,4]]', `마주 보는 면 쌍, 실제 ${JSON.stringify(pairs)}`)
  for (const [f, g] of pairs) {
    const [a, b] = [faceNormal(poly, f), faceNormal(poly, g)]
    check(Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + 1) < EPS, `면 ${f}·${g} 의 법선이 반대`)
    check(Math.abs(faceArea(poly, f) - faceArea(poly, g)) < EPS, `면 ${f}·${g} 의 넓이가 같음`)
  }
  check(Math.abs(faceArea(poly, 0) - 12) < EPS && Math.abs(faceArea(poly, 1) - 6) < EPS && Math.abs(faceArea(poly, 3) - 8) < EPS, '앞면 4×3, 왼쪽 2×3, 윗면 4×2')
  check(lessonStepCount(cuboid, 'surface-area') === 3, '겉넓이 단계 = 묶음 3개')
  const s = lessonSummary(cuboid, 'surface-area')!
  check(s.formula === '2 × 12 + 2 × 8 + 2 × 6' && s.value === '52 cm²', `겉넓이 공식, 실제 ${s.formula} = ${s.value}`)
}

// 피타고라스 (TODO-30): 입체 대각선, 겉면 최단 거리 후보와 직각삼각형
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const L = diagonalLayout({ width: 4, depth: 2, height: 3 })
  check(Math.abs(L.base - Math.sqrt(20)) < EPS && Math.abs(L.space - Math.sqrt(29)) < EPS, '4×2×3 밑면 대각선 √20, 입체 대각선 √29')
  check(lessonStepCount(cuboid, 'diagonal') === 3, '대각선 단계 = 3')
  const s = lessonSummary(cuboid, 'diagonal')!
  check(s.formula === '√(4² + 2² + 3²) = √29' && s.value === '약 5.39 cm', `대각선 공식, 실제 ${s.formula} = ${s.value}`)

  const routes = shortestRoutes(polyhedronOf(cuboid)!)
  check(routes.length === 2, `펼친 전개도에서 곧은 길 2개, 실제 ${routes.length}`)
  check(routes[0].length > routes[1].length && Math.abs(routes[1].length - Math.sqrt(41)) < EPS, '긴 길부터, 마지막이 최단 √41')
  for (const r of routes) {
    const a = r.legLengths[0].reduce((x, y) => x + y, 0)
    const b = r.legLengths[1][0]
    check(Math.abs(a * a + b * b - r.length * r.length) < EPS, `두 변 ${a}, ${b} 로 빗변 ${r.length} (피타고라스)`)
    check(r.segments.length === 2 && r.segments[0].face !== r.segments[1].face, '길은 두 면 위 선분')
    const [u, v] = r.corner.dirs
    check(Math.abs(u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) < EPS, '직각 표시의 두 방향이 수직')
  }
  check(lessonStepCount(cuboid, 'shortest-path') === 4, '최단 거리 단계 = 길마다 2')
  const p = lessonSummary(cuboid, 'shortest-path')!
  check(p.formula === '√((4 + 2)² + 3²) = √45 > √((3 + 2)² + 4²)' && p.value === '√41', `최단 거리 공식, 실제 ${p.formula} = ${p.value}`)
  const cube: ShapeScene = { shape: 'cube', size: { edge: 2 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const c = lessonSummary(cube, 'shortest-path')!
  check(c.formula === '√((2 + 2)² + 2²) = √20 = √((2 + 2)² + 2²)' && c.value === '√20', `정육면체는 두 길이 같다, 실제 ${c.formula} = ${c.value}`)
}

// 위치 관계 (TODO-28): 모서리 12개, 어느 모서리를 기준으로 해도 평행 3 · 수직으로 만남 4 · 꼬인 위치 4
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const poly = polyhedronOf(cuboid)!
  const edges = edgesOf(poly)
  check(edges.length === 12, `직육면체 모서리 12개, 실제 ${edges.length}`)
  check(JSON.stringify(defaultEdge(poly)) === '[0,1]', '처음 기준 모서리는 앞면 첫 모서리 0-1')
  for (const ref of edges) {
    const r = edgeRelations(poly, ref)
    check(r.parallel.length === 3 && r.meet.length === 4 && r.skew.length === 4, `기준 ${ref}: 평행 ${r.parallel.length}, 만남 ${r.meet.length}, 꼬인 위치 ${r.skew.length}`)
    check(r.perpendicular.length === 4, `기준 ${ref}: 만나는 모서리는 모두 수직`)
    for (const e of r.meet) {
      const shared = e.find((v) => ref.includes(v))
      const at = meetPoint(poly, ref, e)
      check(shared !== undefined && at.every((x, k) => Math.abs(x - poly.positions[shared][k]) < EPS), `기준 ${ref} 와 ${e} 는 같은 꼭짓점에서 만남`)
    }
  }
  const r01 = edgeRelations(poly, [0, 1])
  check(JSON.stringify(r01.parallel) === '[[2,3],[4,5],[6,7]]', `0-1 과 평행: ${JSON.stringify(r01.parallel)}`)
  check(lessonStepCount(cuboid, 'edge-relations') === 3, '위치 관계 단계 = 3')
  const s = lessonSummary(cuboid, 'edge-relations')!
  check(s.formula === '평행 3 + 수직으로 만남 4 + 꼬인 위치 4' && s.value === '나머지 모서리 11개', `위치 관계 공식, 실제 ${s.formula} = ${s.value}`)
  check(lessonHint({ kind: 'edge-relations', progress: 2 / 3 })!.includes('평행일까요'), '꼬인 위치 직전에 평행인지 묻는다')
  check(lessonHint({ kind: 'edge-relations', progress: 0.5 }) === null && lessonHint({ kind: 'volume', progress: 2 / 3 }) === null, '그 밖의 멈춤에는 안내 없음')
}

// 닮음 (TODO-29): k배 직육면체에 원래 앞면 k² 장, 원래 직육면체 k³ 개가 겹치지 않고 꼭 들어간다
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  for (const k of [2, 3]) {
    const L = similarLayout({ width: 4, depth: 2, height: 3 }, k)
    const [bw, bh, bd] = [0, 1, 2].map((i) => L.big.max[i] - L.big.min[i])
    check(Math.abs(bw - 4 * k) < EPS && Math.abs(bh - 3 * k) < EPS && Math.abs(bd - 2 * k) < EPS, `k=${k}: k배 직육면체 ${bw}×${bh}×${bd}`)
    check(L.big.min[0] > 2 + EPS, `k=${k}: k배는 원래 것과 겹치지 않게 오른쪽에`)
    check(L.segments.length === k && Math.abs(L.segments.at(-1)!.to[0] - L.big.max[0]) < EPS, `k=${k}: 모서리 조각 ${k}개가 k배 모서리를 채움`)
    check(L.tiles.length === k * k && L.tiles.every((t) => t.center[0] > L.big.min[0] && t.center[0] < L.big.max[0] && t.center[1] > L.big.min[1] && t.center[1] < L.big.max[1]), `k=${k}: 앞면 ${k * k}장이 k배 앞면 안에`)
    check(L.boxes.length === k ** 3 && L.boxes.every((b) => b.center.every((c, i) => c > L.big.min[i] && c < L.big.max[i])), `k=${k}: 조각 ${k ** 3}개가 k배 안에`)
    check(new Set(L.boxes.map((b) => b.center.join(','))).size === k ** 3, `k=${k}: 조각 자리가 겹치지 않음`)
    check(L.boxes.filter((b) => b.layer === 0).every((b, i) => b.index === i), `k=${k}: 층 안 순서`)
    check(lessonStepCount(cuboid, 'similar', k) === similarSteps(k) && similarSteps(k) === 2 + k, `k=${k}: 단계 = 길이 + 한 면 + 층 ${k}`)
    const s = lessonSummary(cuboid, 'similar', k)!
    check(s.formula === `닮음비 1 : ${k}` && s.ratios![0].value === `1 : ${k}²` && s.ratios![0].note === `= 1 : ${k * k}` && s.ratios![1].value === `1 : ${k}³` && s.ratios![1].note === `= 1 : ${k ** 3}`, `k=${k}: 닮음 공식, 실제 ${s.formula}`)
    check(lessonHint({ kind: 'similar', progress: 2 / similarSteps(k), scale: k }) === `한 면은 ${k * k}배였어요. 부피는 몇 배일까요?`, `k=${k}: 부피 직전에 묻는다`)
  }
  check(lessonHint({ kind: 'similar', progress: 0 })!.includes('2배'), '닮음비 기본 2')
  check(lessonHint({ kind: 'similar', progress: 1 })!.includes('모서리 길이'), '끝나면 모서리 길이의 합을 묻는다')
}

// 다른 전개도(grid)로 접은 입체: 부피 조각이 실제 입체 안에 들어가고, 치수·부피가 맞는다 (허공에 뜨지 않게)
for (let k = 0; k < NET_VARIANTS.length; k++) {
  const scene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'grid', faces: netVariant(k, [4, 2, 3]) } } as ShapeScene
  const box = boxSizeOf(scene)!
  check([box.width, box.depth, box.height].sort().join() === '2,3,4', `전개도 ${k} 치수 ${JSON.stringify(box)}`)
  check(lessonSummary(scene, 'volume')!.value === '24 cm³', `전개도 ${k} 부피`)
  const pts = polyhedronOf(scene)!.positions
  const [cx, cy, cz] = boxCenterOf(scene)
  const inside = (v: number, a: number) => Math.min(...pts.map((p) => p[a])) - 1e-6 <= v && v <= Math.max(...pts.map((p) => p[a])) + 1e-6
  const { cubes } = volumeLayout(box.width, box.depth, box.height)
  check(cubes.length === 24, `전개도 ${k} 조각 수 ${cubes.length}`)
  check(cubes.every((c) => inside(c.x + cx - c.sx / 2, 0) && inside(c.x + cx + c.sx / 2, 0) && inside(c.y + cy - c.sy / 2, 1) && inside(c.y + cy + c.sy / 2, 1) && inside(c.z + cz - c.sz / 2, 2) && inside(c.z + cz + c.sz / 2, 2)), `전개도 ${k}: 부피 조각이 입체 밖`)
}
// 닫히지 않는 잘못된 전개도는 설명이 없다
{
  const sq = (x: number, y: number) => ({ x, y, w: 1, h: 1 })
  const wrong = { shape: 'cube', size: { edge: 1 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'grid', faces: [sq(0, 1), sq(1, 1), sq(2, 1), sq(3, 1), sq(0, 0), sq(1, 0)] } } as ShapeScene
  check(lessonStepCount(wrong, 'volume') === 0 && lessonSummary(wrong, 'volume') === null, '잘못된 전개도에는 설명 없음')
}

// 다른 도형: 같은 모양 묶음, 부피·겉넓이 값이 공식과 맞는지, 탭 (대각선·최단 거리는 상자만)
{
  const solid = (shape: string, size: object) => ({ shape, size, vertexLabels: [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const groupsOf = (scene: ShapeScene) => surfaceGroups(polyhedronOf(scene)!).map((g) => g.length).sort((a, b) => b - a).join()
  const prism = solid('prism', { sides: 5, edge: 2, height: 4 })
  const pyramid = solid('pyramid', { sides: 4, edge: 3, height: 4 })
  const cube = { shape: 'cube', size: { edge: 3 }, vertexLabels: [], lines: [], net: { layout: 'cross' } } as unknown as ShapeScene
  check(groupsOf(prism) === '5,2' && groupsOf(pyramid) === '4,1' && groupsOf(cube) === '6', `같은 모양 묶음 ${groupsOf(prism)} ${groupsOf(pyramid)} ${groupsOf(cube)}`)
  check(lessonSummary(cube, 'surface-area')!.formula === '6 × 9' && lessonSummary(cube, 'surface-area')!.value === '54 cm²', '정육면체 겉넓이 6 × 9')
  // 각뿔: 밑넓이 9 × 높이 4 × ⅓ = 12, 단계 3 (세 번 붓기)
  check(lessonSummary(pyramid, 'volume')!.value === '12 cm³' && lessonStepCount(pyramid, 'volume') === 5, `각뿔 부피 ${lessonSummary(pyramid, 'volume')!.value}`)
  // 오각기둥: 밑넓이가 √ 라 숫자로 계산하지 않는다, 단계 = 밑면 + 층 수
  check(lessonSummary(prism, 'volume')!.formula === '밑넓이 × 높이 4' && lessonSummary(prism, 'volume')!.value === undefined && lessonStepCount(prism, 'volume') === 5, `오각기둥 부피 ${lessonSummary(prism, 'volume')!.value}`)
  // 정다면체 개수: V − E + F = 2 인 알려진 값
  const tetra = solid('regular-tetrahedron', { edge: 3 })
  const ico = solid('regular-icosahedron', { edge: 2 })
  const table = (scene: ShapeScene) => lessonSummary(scene, 'counts')!.table!.map((c) => c[1]).join('/')
  check(table(tetra) === '4/6/4' && table(ico) === '20/30/12' && table(solid('regular-octahedron', { edge: 2 })) === '8/12/6' && table(solid('regular-dodecahedron', { edge: 2 })) === '12/30/20', `정다면체 개수 ${table(tetra)} ${table(ico)}`)
  check(lessonStepCount(tetra, 'counts') === 3 && lessonStepCount(prism, 'counts') === 0, '개수는 정다면체만')
  check(lessonHint({ kind: 'counts', progress: 2 / 3 }, ico) === '모서리가 30개예요', `개수 안내 ${lessonHint({ kind: 'counts', progress: 2 / 3 }, ico)}`)
  // 정다면체 겉넓이·부피: √ 를 쓴 식과 답 (정사면체 √2a³/12, 정팔면체 √2a³/3). 부피는 정사면체·정팔면체만
  const octa = solid('regular-octahedron', { edge: 3 })
  const dodeca = solid('regular-dodecahedron', { edge: 2 })
  const triangular0 = solid('prism', { sides: 3, edge: 2, height: 4 })
  const area = (scene: ShapeScene) => lessonSummary(scene, 'surface-area')!
  const volume = (scene: ShapeScene) => lessonSummary(scene, 'volume')!
  check(area(tetra).value === '9√3 cm²' && area(tetra).formula === '면 하나 9√3/4 × 4' && volume(tetra).value === '9√2/4 cm³' && volume(tetra).formula === '⅓ × 9√3/4 × √6' && lessonStepCount(tetra, 'surface-area') === 3 && lessonStepCount(tetra, 'volume') === 2, `정사면체 ${area(tetra).value} ${volume(tetra).value}`)
  check(area(octa).value === '18√3 cm²' && volume(octa).value === '9√2 cm³' && volume(octa).formula === '2 × ⅓ × 9 × 3√2/2' && lessonStepCount(octa, 'volume') === 2, `정팔면체 ${area(octa).value} ${volume(octa).value}`)
  check(area(ico).value === '20√3 cm²' && lessonStepCount(ico, 'surface-area') === 3 && lessonStepCount(ico, 'volume') === 0 && lessonSummary(ico, 'volume') === null, `정이십면체 ${area(ico).value}`)
  check(area(dodeca).formula === '정오각형 넓이 × 12' && area(dodeca).value === undefined && lessonStepCount(dodeca, 'surface-area') === 2 && lessonStepCount(dodeca, 'volume') === 0, '정십이면체는 식만, 부피 없음')
  check(lessonHint({ kind: 'surface-area', progress: 2 / 3 }, tetra) === '높이 = √(3² − 1.5²) = 3√3/2 cm. 넓이 = 3 × 3√3/2 ÷ 2 = 9√3/4 cm²', `피타고라스 안내 ${lessonHint({ kind: 'surface-area', progress: 2 / 3 }, tetra)}`)
  // 각뿔·원뿔·삼각기둥 겉넓이: 피타고라스 단계가 앞에 하나 더. 정오각형 밑면, 사각기둥에는 없다
  const square = solid('pyramid', { sides: 4, edge: 6, height: 4 })
  check(slantPlan(square)!.hint === '밑변 6 cm 의 절반 3 cm. 옆면 높이 = √(4² + 3²) = 5 cm' && lessonStepCount(square, 'surface-area') === surfaceGroups(polyhedronOf(square)!).length + 1 && lessonHint({ kind: 'surface-area', progress: 1 / lessonStepCount(square, 'surface-area') }, square) === '밑변 6 cm 의 절반 3 cm. 옆면 높이 = √(4² + 3²) = 5 cm', `사각뿔 ${slantPlan(square)?.hint}`)
  check(slantPlan(solid('pyramid', { sides: 5, edge: 2, height: 4 })) === null && slantPlan(solid('prism', { sides: 4, edge: 3, height: 5 })) === null, '구하지 않는 값은 단계 없음')
  check(slantPlan(solid('pyramid', { sides: 3, edge: 2, height: 4 })) === null && slantPlan(solid('pyramid', { sides: 6, edge: 2, height: 4 }))!.hint === '옆면 높이 = √(4² + (√3)²) = √19 cm', '삼각뿔은 제곱이 떨어질 때만, 육각뿔 √19')
  const triPrism = solid('prism', { sides: 3, edge: 2, height: 4 })
  check(slantPlan(triPrism)!.rise === '√3 cm' && lessonHint({ kind: 'surface-area', progress: 1 / lessonStepCount(triPrism, 'surface-area') }, triPrism)!.startsWith('밑면 높이 = √(2² − 1²) = √3 cm'), '삼각기둥 밑면 높이')
  check(surd(9, 4, 3) === '9√3/4' && surd(4, 4, 3) === '√3' && surd(3, 3, 6) === '√6' && surd(1, 2, 2) === '√2/2', '√ 표기')
  // 기둥 겉넓이: 위아래 면 묶음은 윗면으로 보여준다 (밑면은 바닥에 가려 안 보인다)
  for (const scene of [solid('cuboid', { width: 4, depth: 2, height: 3 }), cube, prism, triangular0]) {
    const p = polyhedronOf(scene)!
    const caps = surfaceSteps(p).filter((s) => s.faces.some((f) => Math.abs(faceNormal(p, f)[1]) > 0.99))
    check(caps.length === 1 && faceNormal(p, caps[0].face)[1] > 0.99, `${scene.shape} 윗면으로 보여줌`)
  }
  // 도형별 탭
  check(lessonTabs(cube).join() === 'surface-area,volume,edge-relations,diagonal,similar,shortest-path,section' && lessonTabs(prism).join() === 'surface-area,volume,section' && lessonTabs(pyramid).join() === 'surface-area,volume,section' && lessonTabs(ico).join() === 'counts,surface-area,volume,section', '도형별 탭')
  // 단위는 최종 값에만: 식에는 단위가 없고, 값이 없으면 안 쓴다
  const triangular = solid('prism', { sides: 3, edge: 2, height: 4 })
  check(lessonSummary(triangular, 'surface-area')!.formula === '√3 × 2 + 옆넓이 24' && lessonSummary(triangular, 'surface-area')!.value === '24 + 2√3 cm²', `삼각기둥 겉넓이 ${lessonSummary(triangular, 'surface-area')!.formula}`)
  // 기본 치수가 떨어지는 값인가: 사각기둥 3·5, 사각뿔 6·4
  check(lessonSummary(solid('prism', { sides: 4, edge: 3, height: 5 }), 'surface-area')!.value === '78 cm²' && lessonSummary(solid('pyramid', { sides: 4, edge: 6, height: 4 }), 'surface-area')!.value === '96 cm²' && lessonSummary(solid('pyramid', { sides: 4, edge: 6, height: 4 }), 'volume')!.value === '48 cm³', '각기둥·각뿔 기본값')
  for (const scene of [prism, pyramid]) {
    for (const k of ['surface-area', 'edge-relations', 'similar', 'volume'] as const) check(lessonStepCount(scene, k) > 0, `${scene.shape} ${k} 있음`)
    for (const k of ['diagonal', 'shortest-path'] as const) check(lessonStepCount(scene, k) === 0, `${scene.shape} ${k} 없음`)
  }
}

// 일반 공식: 중등은 문자, 초등은 말. 글자는 3D 선과 같은 색
{
  const expected: [string, string, string][] = [['cuboid', '2(ab + bc + ca)', 'abc'], ['cube', '6a²', 'a³'], ['prism', '(밑넓이) × 2 + (옆넓이)', '(밑넓이) × h'], ['cylinder', '2πr² + 2πrh', 'πr²h'], ['pyramid', '(밑넓이) + (옆넓이)', '⅓ × (밑넓이) × h'], ['cone', 'πr² + πrl (l = 모선)', '⅓πr²h'], ['sphere', '4πr²', '⁴⁄₃πr³'], ['regular-tetrahedron', '√3a²', '(√2/12)a³'], ['regular-octahedron', '2√3a²', '(√2/3)a³']]
  for (const [shape, area, volume] of expected) check(generalFormula(shape as never, 'surface-area', 'pi') === area && generalFormula(shape as never, 'volume', 'pi') === volume, `${shape} 공식`)
  check(generalFormula('regular-icosahedron', 'surface-area', 'pi') === '면 하나 넓이 × 면 개수' && generalFormula('regular-icosahedron', 'volume', 'pi') === null && generalFormula('cube', 'diagonal', 'pi') === null, '일반 공식 없는 곳')
  check(generalFormula('cylinder', 'volume', '3.14') === '밑넓이 × 높이' && generalFormula('cuboid', 'volume', '3.14') === '가로 × 세로 × 높이', '초등은 말 공식')
  const tokens = colorTokens('2πr² + 2πrh')
  check(tokens.map((t) => t.text).join('') === '2πr² + 2πrh' && tokens.find((t) => t.text === 'r')!.color === LENGTH_COLOR.r && tokens.find((t) => t.text === 'h')!.color === LENGTH_COLOR.h, '글자 색')
  check(colorTokens('밑넓이 × 높이').find((t) => t.text === '높이')!.color === LENGTH_COLOR.h && colorTokens('밑넓이 × 높이')[0].color === undefined, '말 공식의 색, 밑넓이는 평소 색')
}

// 정육면체 나누기는 사각뿔만: 다른 각뿔은 물 붓기까지
{
  const pentagon = { shape: 'pyramid', size: { sides: 5, edge: 2, height: 4 }, vertexLabels: Array(6).fill(null), lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  check(lessonStepCount(pentagon, 'volume') === 3 && lessonHint({ kind: 'volume', progress: 1 }, pentagon) === '세 번 부으니 딱 찼어요. 그래서 각뿔의 부피는 각기둥의 ⅓이에요' && lessonHint({ kind: 'volume', progress: 1 / 3 }, pentagon)!.startsWith('1번 부었어요'), `오각뿔 ${lessonHint({ kind: 'volume', progress: 1 }, pentagon)}`)
}

// 구 단면 비교: 어느 높이에서도 반구 단면 = 고리. 탭에는 없다
{
  const ball = { shape: 'sphere', size: { radius: 6 }, vertexLabels: [], lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  for (const cut of [0, 1 / 12, 0.5, 11 / 12]) {
    const h = 6 * cut
    const rho2 = 36 - h * h // 피타고라스
    check(Math.abs(Math.PI * rho2 - (Math.PI * 36 - Math.PI * h * h)) < 1e-9, `단면 넓이 같음 ${cut}`)
  }
  const lines = sphereSectionLines(6, 0.5)
  check(lines.length === 6 && lines[1].text.endsWith('= 27π') && lines[2].text.endsWith('= 27π') && lines[4].link?.id === CONE_THIRD_LINK && lines[5].text.endsWith('⁴⁄₃πr³'), `단면 글 ${lines[1].text}`)
  check(sphereSectionLines(6, 1)[1].text.endsWith('= 0') && lessonSummary(ball, 'sphere-section', 2, '3.14', 0.5)!.lines![1].text.endsWith('= 27π'), '꼭대기, 초등을 골라 두어도 심화는 π 그대로')
  check(!lessonTabs(ball).includes('sphere-section') && lessonStepCount(ball, 'sphere-section') === 1 && lessonGrade({ kind: 'sphere-section', progress: 0 }, ball) === '중2 이상 · 심화' && lessonSummary(ball, 'sphere-section', 2, 'pi', 0.5)!.lines!.length === 6, '심화 보기')
  check(lessonHint({ kind: 'sphere-section', progress: 1 }, ball) === null && lessonHint({ kind: 'sphere-section', progress: 0 }, ball)!.includes('단면'), '슬라이더 중에는 안내 글 없음')
  check(colorTokens('단면 반지름² = r² − h²')[0].color === SECTION_RADIUS_COLOR, '단면 반지름 색')
}

// 실 감기: 원기둥을 한 바퀴 감은 실은 직각삼각형의 빗변
{
  const shape = (s: string, radius: number, height: number) => ({ shape: s, size: { radius, height }, vertexLabels: s === 'cone' ? [null] : [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const pipe = shape('cylinder', 3, 5)
  check(lessonSummary(pipe, 'thread')!.value === '√(36π² + 25) cm' && lessonSummary(pipe, 'thread')!.formula === '√((6π)² + 5²)' && lessonSummary(pipe, 'thread')!.general === '√((2πr)² + h²)', `원기둥 실 ${lessonSummary(pipe, 'thread')!.value}`)
  check(lessonSummary(pipe, 'thread', 2, '3.14')!.value === `약 ${+Math.hypot(18.84, 5).toFixed(2)} cm` && lessonStepCount(pipe, 'thread') === 3 && lessonTabs(pipe).join() === 'surface-area,volume,thread,revolve,section', '원기둥 실 3.14, 탭')
  check(lessonStepCount(shape('cone', 3, 4), 'thread') === 0 && !lessonTabs(shape('cone', 3, 4)).includes('thread'), '원뿔에는 실 감기가 없다')
  check(lessonGrade({ kind: 'thread', progress: 0 }, pipe) !== null && !lessonTabs({ shape: 'prism', size: { sides: 4, edge: 3, height: 5 }, vertexLabels: [], lines: [], net: { layout: 'default' } } as unknown as ShapeScene).includes('similar'), '학년 표시, 닮음은 직육면체·정육면체에만')
}

// 피타고라스로 구한 값은 겉넓이가 끝날 때까지 왼쪽 쪽에 남는다
{
  const coneScene = { shape: 'cone', size: { radius: 3, height: 4 }, vertexLabels: [null], lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  const tetraScene = { shape: 'regular-tetrahedron', size: { edge: 3 }, vertexLabels: Array(4).fill(null), lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  check(lessonNote({ kind: 'surface-area', progress: 1 / 4 }, coneScene) === null && lessonNote({ kind: 'surface-area', progress: 1 }, coneScene) === '모선 = √(3² + 4²) = 5 cm', '원뿔 모선이 끝까지')
  check(lessonNote({ kind: 'surface-area', progress: 1 }, tetraScene)!.startsWith('높이 = √(3² − 1.5²)') && lessonNote({ kind: 'surface-area', progress: 2 / 3 }, tetraScene) === null && lessonNote({ kind: 'volume', progress: 1 }, coneScene) === null, '정사면체 높이가 끝까지, 부피에는 없음')
}

// 각기둥 겉넓이: 옆면을 펴면 가로 = 밑면 둘레. 각뿔: 같은 삼각형을 붙여 직사각형
{
  for (const n of [3, 4, 5, 6, 7]) {
    const ring = [...Array(n).keys()].map((k): [number, number] => { const t = ((k + 0.5) * 2 * Math.PI) / n; return [Math.sin(-Math.PI + t) * 2, Math.cos(-Math.PI + t) * -2] })
    const seg = (p: [number, number][]) => p.slice(1).map((q, i) => Math.hypot(q[0] - p[i][0], q[1] - p[i][1]))
    const side = Math.hypot(ring[1][0] - ring[0][0], ring[1][1] - ring[0][1])
    for (const s of [0, 0.4, 1]) check(unrollChain(ring, s).length === n + 1 && seg(unrollChain(ring, s)).every((l) => Math.abs(l - side) < 1e-9), `${n}각형 펴도 변 길이 그대로 s=${s}`)
    check(stripIndex(n).every((v) => v < 2 * (n + 1)) && new Set(stripIndex(n)).size === 2 * (n + 1) && stripIndex(n).length === 6 * n, `${n}각형 띠의 번호: 없는 점을 가리키지 않고 모든 점을 쓴다`)
    const closed = unrollChain(ring, 0)
    check(Math.hypot(closed[0][0] - closed[n][0], closed[0][1] - closed[n][1]) < 1e-9, `${n}각형 s=0 은 닫힘`)
    const flat = unrollChain(ring, 1)
    check(Math.abs(Math.hypot(flat[n][0] - flat[0][0], flat[n][1] - flat[0][1]) - n * side) < 1e-9, `${n}각형 s=1 은 가로 = 둘레`)
    const fixed = unrollChain(ring, 0.5)
    const i = fixed.findIndex((p) => Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]) < 1e-9)
    check(i >= 0 && Math.hypot(fixed[i + 1][0] - ring[1][0], fixed[i + 1][1] - ring[1][1]) < 1e-9, `${n}각형 앞 변은 그대로`)
  }
  const prism = (sides: number, edge: number, height: number) => ({ shape: 'prism', size: { sides, edge, height }, vertexLabels: Array(2 * sides).fill(null), lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  check(lessonSummary(prism(4, 3, 5), 'surface-area')!.formula === '밑넓이 9 × 2 + 옆넓이 60' && lessonSummary(prism(4, 3, 5), 'surface-area')!.value === '78 cm²' && lessonStepCount(prism(4, 3, 5), 'surface-area') === 2, '사각기둥')
  check(lessonStepCount(prism(3, 2, 4), 'surface-area') === 3 && lessonSummary(prism(5, 2, 4), 'surface-area')!.formula === '밑넓이 × 2 + 옆넓이 40' && lessonSummary(prism(5, 2, 4), 'surface-area')!.value === undefined, '삼각기둥 단계, 오각기둥은 식만')
  check(lessonHint({ kind: 'surface-area', progress: 1 / 2 }, prism(4, 3, 5)) === '밑넓이 = 3 × 3 = 9 cm²' && lessonHint({ kind: 'surface-area', progress: 1 }, prism(4, 3, 5))!.includes('밑면 둘레 4 × 3 = 12 cm') && lessonHint({ kind: 'surface-area', progress: 1 / 2 }, prism(5, 2, 4))!.includes('삼각형 5개'), '각기둥 안내')
  // 각기둥 부피: 다 쌓은 뒤 맨 위 면에서 밑넓이. 삼각기둥은 √ 로 답까지
  check(lessonSummary(prism(3, 3, 5), 'volume')!.formula === '밑넓이 9√3/4 × 높이 5' && lessonSummary(prism(3, 3, 5), 'volume')!.value === '45√3/4 cm³', `삼각기둥 부피 ${lessonSummary(prism(3, 3, 5), 'volume')!.value}`)
  check(lessonHint({ kind: 'volume', progress: 5 / 6 }, prism(3, 3, 5)) === '한 층 = 밑넓이 × 1 · 5층까지 밑넓이 × 5' && lessonHint({ kind: 'volume', progress: 1 }, prism(3, 3, 5))!.startsWith('밑면 높이 = √(3² − 1.5²)') && lessonHint({ kind: 'volume', progress: 1 }, prism(4, 3, 5)) === '밑넓이 = 3 × 3 = 9 cm²', '각기둥 부피 안내')
  const pyramid = { shape: 'pyramid', size: { sides: 4, edge: 6, height: 4 }, vertexLabels: Array(5).fill(null), lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  check(lessonSummary(pyramid, 'surface-area')!.formula === '밑넓이 36 + 옆넓이 4 × 15' && lessonSummary(pyramid, 'surface-area')!.value === '96 cm²', `사각뿔 ${lessonSummary(pyramid, 'surface-area')!.formula}`)
  const steps = lessonStepCount(pyramid, 'surface-area')
  const hints = [...Array(steps).keys()].map((k) => lessonHint({ kind: 'surface-area', progress: (k + 1) / steps }, pyramid)!)
  check(hints.some((h) => h.startsWith('같은 삼각형을 붙이면 직사각형이에요. 그 반이라 6 × 5 ÷ 2 = 15 cm²')), `각뿔 안내 ${hints}`)
}

// 회전체: 평면도형의 둘레는 축에서 시작해 축으로 돌아온다. 입체의 치수 그대로
{
  const round = (shape: string, radius: number, height: number) => ({ shape, size: { radius, height }, vertexLabels: shape === 'cone' ? [null] : [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const figures: RevolutionSize[] = [{ figure: 'rectangle', radius: 3, height: 5, gap: 0 }, { figure: 'right-triangle', radius: 3, height: 4, gap: 0 }, { figure: 'trapezoid', radius: 5, height: 4, top: 2, gap: 0 }, { figure: 'semicircle', radius: 3, height: 6, gap: 0 }]
  for (const size of figures) {
    const p = profileOf(size)
    check(p[0][0] === 0 && p[0][1] === 0 && Math.abs(p[p.length - 1][0]) < 1e-9 && Math.abs(p[p.length - 1][1] - heightOf(size)) < 1e-9, `${size.figure} 둘레는 축에서 축으로`)
    const moved = profileOf({ ...size, gap: 2 })
    check(moved.every(([x]) => x >= 2 - 1e-9) && moved[0][0] === moved[moved.length - 1][0] && moved[0][1] === moved[moved.length - 1][1], `${size.figure} 떨어뜨리면 닫힌 둘레`)
  }
  check(profileOf(figures[3]).every(([x, y]) => Math.abs(Math.hypot(x, y - 3) - 3) < 1e-9), '반원은 가운데에서 거리 r')
  const solidOf = (size: RevolutionSize) => ({ shape: 'revolution', size, vertexLabels: [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const area = (size: RevolutionSize) => revolutionMeasure(size)?.area.map((l) => l.text).join(' / ')
  const volume = (size: RevolutionSize) => revolutionMeasure(size)?.volume.map((l) => l.text).join(' / ')
  check(area(figures[0]) === '겉넓이 = 2πr² + 2πrh = 48π cm²' && volume(figures[0]) === '부피 = πr²h = 45π cm³', `원기둥 ${area(figures[0])} ${volume(figures[0])}`)
  check(area(figures[1]) === '겉넓이 = πr² + πrl = 9π + 15π = 24π cm²' && volume(figures[1]) === '부피 = ⅓πr²h = 12π cm³', `원뿔 ${area(figures[1])}`)
  check(area(figures[2]) === '겉넓이 = 아랫면 + 윗면 + 바깥 옆면 / = 25π + 4π + 35π = 64π cm²' && volume(figures[2]) === '부피 = 큰 원뿔 − 작은 원뿔 / = 52π cm³', `원뿔대 ${area(figures[2])} ${volume(figures[2])}`)
  const ball = { figure: 'semicircle', radius: 6, height: 12, gap: 0 } as RevolutionSize
  check(area(ball) === '겉넓이 = 4πr² = 144π cm²' && volume(ball) === '부피 = ⁴⁄₃πr³ = 288π cm³', '구')
  // 축에서 떨어지면 바깥 입체 − 가운데 구멍. 삼각형은 파푸스 정리 값과 맞춘다: 2π × 무게중심 2 × 넓이 6 = 24π
  const hollow = { figure: 'rectangle', radius: 2, height: 5, gap: 1 } as RevolutionSize
  check(volume(hollow) === '부피 = 바깥 입체 − 가운데 구멍 / = 45π − 5π = 40π cm³' && area(hollow) === '겉넓이 = 아래 고리 + 위 고리 + 바깥 옆면 + 안쪽 옆면 / = 8π + 8π + 30π + 10π = 56π cm²', `뚫린 원기둥 ${area(hollow)} ${volume(hollow)}`)
  const hollowTriangle = { figure: 'right-triangle', radius: 3, height: 4, gap: 1 } as RevolutionSize
  check(volume(hollowTriangle) === '부피 = 바깥 입체 − 가운데 구멍 / = 28π − 4π = 24π cm³' && area(hollowTriangle) === '겉넓이 = 아래 고리 + 바깥 옆면 + 안쪽 옆면 / = 15π + 25π + 8π = 48π cm²', `뚫린 삼각형 ${area(hollowTriangle)} ${volume(hollowTriangle)}`)
  check(volume({ figure: 'trapezoid', radius: 5, height: 4, top: 2, gap: 1 })!.endsWith('= 84π − 4π = 80π cm³'), `뚫린 사다리꼴 ${volume({ figure: 'trapezoid', radius: 5, height: 4, top: 2, gap: 1 })}`)
  check(revolutionMeasure({ figure: 'semicircle', radius: 3, height: 6, gap: 1 }) === null, '떨어진 반원은 중학교 공식으로 구하지 않는다')
  check(lessonTabs(solidOf(figures[0])).join() === 'revolve,section,revolve-net,revolve-area,revolve-volume' && lessonStepCount(solidOf(figures[3]), 'revolve-net') === 0 && lessonStepCount(solidOf({ ...figures[0], gap: 1 }), 'revolve-net') === 0 && lessonStepCount(solidOf({ ...figures[1], gap: 1 }), 'revolve-area') === 1 && lessonStepCount(solidOf({ ...figures[3], gap: 1 }), 'revolve-volume') === 0, '회전체 탭')
  check(lessonHint({ kind: 'revolve', progress: 1 }, solidOf(figures[2])) === '사다리꼴을 한 바퀴 돌렸더니 원뿔대가 됐어요' && lessonHint({ kind: 'revolve', progress: 1 }, solidOf({ ...figures[0], gap: 1 }))!.includes('가운데가 뚫린') && lessonHint({ kind: 'section', progress: 1 }, solidOf(figures[1])) === '세로로 자르면 이등변삼각형이에요' && lessonHint({ kind: 'revolve-net', progress: 1 }, solidOf(figures[2]))!.includes('작은 부채꼴을 뺀') && lessonHint({ kind: 'revolve', progress: 0.5 }, solidOf(figures[0])) === null, '회전체 안내')
  check(lessonSummary(solidOf(figures[0]), 'revolve-volume')!.lines![0].text === '부피 = πr²h = 45π cm³' && lessonGrade({ kind: 'revolve-volume', progress: 1 }, solidOf(figures[0])) === null, '왼쪽 쪽 부피, 학년 표시 없음')
  check(colorTokens('= 48π cm²').every((t) => t.color === undefined), 'cm 는 색칠하지 않는다')
  // 단면: 띠를 더한 넓이가 공식과 맞는다
  const areaOf = (size: RevolutionSize, kind: 'vertical' | 'horizontal' | 'tilted', cut: number) => {
    const strips = sectionStrips(size, kind, cut, 2000)
    const du = strips[1].u - strips[0].u
    return strips.reduce((sum, { spans }) => sum + spans.reduce((t, [a, b]) => t + (b - a), 0) * du, 0)
  }
  const near = (value: number, want: number, msg: string) => check(Math.abs(value - want) < want * 0.01, `${msg}: ${value} ≠ ${want}`)
  near(areaOf(figures[0], 'vertical', 0.5), 2 * 3 * 5, '원기둥 세로 = 직사각형 둘')
  near(areaOf(figures[0], 'horizontal', 0.5), Math.PI * 9, '원기둥 가로 = 원')
  near(areaOf(figures[1], 'vertical', 0.5), 3 * 4, '원뿔 세로 = 이등변삼각형')
  near(areaOf(figures[1], 'horizontal', 0.5), Math.PI * 1.5 ** 2, '원뿔 가로: 높이 절반이면 반지름 절반')
  near(areaOf(hollow, 'horizontal', 0.5), Math.PI * (9 - 1), '뚫린 원기둥 가로 = 고리')
  near(areaOf(hollow, 'vertical', 0.5), 2 * 2 * 5, '뚫린 원기둥 세로 = 떨어진 직사각형 둘')
  near(areaOf(figures[0], 'tilted', 0.5), (Math.PI * 9) / Math.cos((35 * Math.PI) / 180), '원기둥 비스듬히 = 타원 (옆면만 지날 때)')
  near(areaOf(ball, 'tilted', 0.5), Math.PI * 36, '구는 가운데를 비스듬히 지나도 큰 원')
  check(sectionStrips(hollow, 'horizontal', 0.5).some(({ spans }) => spans.length === 2), '뚫린 곳은 구간이 둘')
  check(areaOf(figures[1], 'horizontal', 1) < 0.1, '원뿔 꼭대기는 단면이 없다')
  check(lessonHint({ kind: 'section', progress: 1, cutKind: 'horizontal' }, solidOf(figures[0])) === '가로로 자르면 원이에요' && lessonHint({ kind: 'section', progress: 1, cutKind: 'tilted' }, solidOf(ball)) === '비스듬히 자르면 원이에요' && lessonHint({ kind: 'section', progress: 1, cutKind: 'horizontal' }, solidOf(hollow)) === '가로로 자르면 고리예요', '단면 안내')
  check(sectionName(figures[0], 'tilted', 0.5) === '타원' && sectionName(figures[0], 'tilted', 0.05) === '타원이 잘린 모양' && sectionName(figures[1], 'horizontal', 1) === null && sectionName(hollow, 'vertical', 0.5) === '떨어진 직사각형 두 개', `단면 이름 ${sectionName(figures[0], 'tilted', 0.05)}`)
  const coneScene = round('cone', 3, 4)
  check(lessonTabs(coneScene).join() === 'surface-area,volume,revolve,section' && lessonStepCount(coneScene, 'revolve') === 1 && lessonGrade({ kind: 'revolve', progress: 0 }, coneScene) === '중1', '회전체 탭')
  check(lessonHint({ kind: 'revolve', progress: 0.5 }, coneScene) === null && lessonHint({ kind: 'revolve', progress: 1 }, coneScene) === '직각삼각형을 한 바퀴 돌렸더니 원뿔이 됐어요' && lessonHint({ kind: 'revolve', progress: 0 }, coneScene)!.includes('빨간 축') && lessonSummary(coneScene, 'revolve') === null, '회전체 안내')
  check(lessonStepCount({ shape: 'prism', size: { sides: 4, edge: 3, height: 5 }, vertexLabels: [], lines: [], net: { layout: 'default' } } as unknown as ShapeScene, 'revolve') === 0, '각기둥에는 없다')
  check(lessonHint({ kind: 'revolve', progress: 1 }, { shape: 'sphere', size: { radius: 6 }, vertexLabels: [], lines: [], net: { layout: 'default' } } as unknown as ShapeScene) === '반원을 한 바퀴 돌렸더니 구가 됐어요', '구 조사')
}

// 다면체 단면: 평면이 모서리와 만나는 점으로 만든 다각형의 이름
{
  const make = (shape: string, size: object) => polyhedronOf({ shape, size, vertexLabels: [], lines: [], net: { layout: 'default' } } as unknown as ShapeScene)!
  const cuboidP = polyhedronOf({ shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: [], lines: [], net: { layout: 'cross' } } as unknown as ShapeScene)!
  const cubeP = polyhedronOf({ shape: 'cube', size: { edge: 3 }, vertexLabels: [], lines: [], net: { layout: 'cross' } } as unknown as ShapeScene)!
  check(polySectionName(cuboidP, 'vertical', 0.5) === '직사각형' && polySectionName(cuboidP, 'horizontal', 0.5) === '직사각형' && polySectionName(cubeP, 'horizontal', 0.5) === '정사각형' && polySectionName(cubeP, 'tilted', 0.5) === '직사각형', `상자 단면 ${polySectionName(cubeP, 'tilted', 0.5)}`)
  check(polySectionName(make('regular-tetrahedron', { edge: 3 }), 'horizontal', 0.5) === '정삼각형', `정사면체 ${polySectionName(make('regular-tetrahedron', { edge: 3 }), 'horizontal', 0.5)}`)
  const squareP = make('pyramid', { sides: 4, edge: 6, height: 4 })
  check(polySectionName(squareP, 'horizontal', 0.5) === '정사각형' && polySectionName(squareP, 'vertical', 0.5) === '이등변삼각형', `사각뿔 ${polySectionName(squareP, 'vertical', 0.5)}`)
  check(polySectionName(squareP, 'horizontal', 1) === null, '꼭대기에서는 단면이 없다')
  check(polySectionName(make('prism', { sides: 5, edge: 2, height: 4 }), 'horizontal', 0.5) === '정오각형' && polySectionName(make('prism', { sides: 6, edge: 2, height: 4 }), 'horizontal', 0.5) === '정육각형', '각기둥 가로는 밑면 모양')
  // 둘레 순서: 이웃한 점을 이으면 넓이가 맞다 (4 × 3 직사각형)
  const pts = polySectionPoints(cuboidP, 'vertical', 0.5)
  const area = pts.reduce((sum, p, i) => { const q = pts[(i + 1) % pts.length]; return sum + p[0] * q[1] - q[0] * p[1] }, 0) / 2
  check(Math.abs(Math.abs(area) - 12) < 1e-9, `직육면체 세로 단면 넓이 ${area}`)
}

// 용어: 끝난 결과 도형에 해당 용어를 띄운다
{
  const boxScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } } as unknown as ShapeScene
  const words = (terms: { word: string }[]) => terms.map((t) => t.word).join()
  check(words(polyTerms(boxScene, polyhedronOf(boxScene)!, 'volume')) === '면,모서리,꼭짓점' && words(polyTerms(boxScene, polyhedronOf(boxScene)!, 'diagonal')) === '입체 대각선' && words(polyTerms(boxScene, polyhedronOf(boxScene)!, 'edge-relations')) === '평행,만남,꼬인 위치', '직육면체 용어')
  check(words(curvedTerms('cone', { radius: 3, height: 4 }, 'surface-area')) === '밑면,옆면,모선' && words(curvedTerms('cylinder', { radius: 3, height: 5 }, 'surface-area')) === '밑면,옆면,밑면', '곡면 용어')
  check(words(revolutionTerms({ figure: 'trapezoid', radius: 5, height: 4, top: 2, gap: 0 }, 'revolve')) === '원뿔대,밑면,옆면,모선' && words(revolutionTerms({ figure: 'rectangle', radius: 3, height: 5, gap: 1 }, 'revolve')) === '밑면,옆면,모선' && words(revolutionTerms({ figure: 'rectangle', radius: 3, height: 5, gap: 0 }, 'section')) === '', '회전체 용어')
  check(words(revolutionTerms({ figure: 'trapezoid', radius: 5, height: 4, top: 2, gap: 0 }, 'revolve-net')) === '밑면,옆면' && words(revolutionTerms({ figure: 'right-triangle', radius: 3, height: 4, gap: 0 }, 'revolve-net')) === '밑면,옆면,모선', '전개도 용어')
}

// 뿔이 왜 ⅓인지: 원판 합 ÷ 원기둥이 ⅓로 가까워지고, 정육면체는 똑같은 사각뿔 3개로 빈틈없이 나뉜다 (구석 꼭대기가 어느 밑면에도 없다)
{
  check(['0.469', '0.385', '0.343', '0.338'].every((v, k) => stairRatio(STAIR_LAYERS[k], 3, 4).toFixed(3) === v), `원판 비율 ${STAIR_LAYERS.map((n) => stairRatio(n).toFixed(3))}`)
  check(STAIR_LAYERS.every((n, k) => k === 0 || stairRatio(n) < stairRatio(STAIR_LAYERS[k - 1])) && stairRatio(100000) - 1 / 3 < 1e-4, '층이 많아질수록 ⅓에 가까워짐')
  const volumeOf = ({ apex, base }: ReturnType<typeof cubePyramids>[number]) => {
    const det = (p: number[], q: number[], r: number[]) => Math.abs(p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6
    const at = (p: number[]) => p.map((c, i) => c - apex[i])
    return det(at(base[0]), at(base[1]), at(base[2])) + det(at(base[0]), at(base[2]), at(base[3]))
  }
  const volumes = cubePyramids(3).map(volumeOf)
  check(volumes.every((v) => Math.abs(v - 9) < 1e-9) && Math.abs(volumes.reduce((a, b) => a + b) - 27) < 1e-9, `사각뿔 3개 ${volumes}`)
  const cone = { shape: 'cone', size: { radius: 3, height: 4 }, vertexLabels: [null], lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  check(lessonStepCount(cone, 'volume') === 5 && lessonHint({ kind: 'volume', progress: 4 / 5, layers: 10 }, cone)!.startsWith('원판 10층 ÷ 원기둥 = 0.385') && lessonHint({ kind: 'volume', progress: 1, layers: 10 }, cone)!.startsWith('판을 옆으로 밀어') && lessonHint({ kind: 'volume', progress: 3 / 5 }, cone)!.startsWith('세 번 부으니 딱 찼어요') && lessonHint({ kind: 'volume', progress: 1 / 5 }, cone)!.startsWith('1번 부었어요'), `원뿔 안내 ${lessonHint({ kind: 'volume', progress: 1, layers: 10 }, cone)}`)
  const pyramid = { shape: 'pyramid', size: { sides: 4, edge: 3, height: 4 }, vertexLabels: Array(5).fill(null), lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  check(lessonStepCount(pyramid, 'volume') === 5 && lessonHint({ kind: 'volume', progress: 1 }, pyramid)!.endsWith('사각뿔 1개 = 정육면체의 ⅓'), '각뿔 안내')
}

// 구: 겉넓이 4πr², 부피 ⁴⁄₃πr³. 기본 r = 6 은 두 값이 달라 헷갈리지 않는다. 전개도가 없어 접기 단계 없음
{
  const ball = (radius: number) => ({ shape: 'sphere', size: { radius }, vertexLabels: [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const six = ball(6)
  check(lessonSummary(six, 'surface-area')!.value === '144π cm²' && lessonSummary(six, 'surface-area')!.formula === '4 × 36π' && lessonSummary(six, 'volume')!.value === '288π cm³' && lessonSummary(six, 'volume')!.formula === '⅔ × 통의 부피 432π', `구 ${lessonSummary(six, 'volume')!.value}`)
  check(lessonSummary(six, 'surface-area', 2, '3.14')!.value === '452.16 cm²' && lessonSummary(six, 'volume', 2, '3.14')!.value === '904.32 cm³', '구 3.14')
  check(lessonSummary(ball(2), 'volume')!.value === '32π/3 cm³' && lessonSummary(ball(2), 'volume', 2, '3.14')!.value === '약 33.49 cm³' && lessonSummary(ball(1.5), 'volume')!.value === '4.5π cm³', `구 분수 ${lessonSummary(ball(2), 'volume')!.value}`)
  check(lessonTabs(six).join() === 'surface-area,volume,revolve,section' && lessonStepCount(six, 'surface-area') === 3 && lessonStepCount(six, 'volume') === 2 && lessonStepCount(six, 'similar') === 0, '구 탭')
  check(lessonHint({ kind: 'surface-area', progress: 1 / 3 }, six) === '가운데를 자른 원의 넓이 = π × 6 × 6 = 36π cm²', `구 안내 ${lessonHint({ kind: 'surface-area', progress: 1 / 3 }, six)}`)
  check(lessonHint({ kind: 'volume', progress: 1 / 2 }, six)!.endsWith('36π × 12 = 432π cm³') && lessonHint({ kind: 'surface-area', progress: 0.4 }, six) === null, '구 부피 안내, 움직이는 동안은 없음')
  const done = pourState(1, 1, 2 / 3)
  check(Math.abs(done.level - 2 / 3) < 1e-9 && done.pour === 0 && pourState(1).level === 1 && pourState(1 / 3).pour === 1, '구는 한 번 부으면 통의 ⅔, 뿔은 세 번')
}

// 원기둥·원뿔: 부피·겉넓이 값, 탭 (겉넓이·부피·닮음만)
{
  const round = (shape: string, radius: number, height: number) => ({ shape, size: { radius, height }, vertexLabels: shape === 'cone' ? [null] : [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const [cylinder, cone] = [round('cylinder', 2, 5), round('cone', 3, 4)]
  check(lessonSummary(round('cylinder', 3, 5), 'surface-area')!.value === '48π cm²' && lessonSummary(round('cylinder', 3, 5), 'volume')!.value === '45π cm³', '원기둥 기본값')
  check(lessonSummary(cylinder, 'volume')!.value === '20π cm³' && lessonSummary(cylinder, 'volume', 2, '3.14')!.value === '62.8 cm³' && lessonStepCount(cylinder, 'volume') === 6, `원기둥 부피 ${lessonSummary(cylinder, 'volume')!.value}`)
  check(lessonSummary(cone, 'volume')!.value === '12π cm³' && lessonStepCount(cone, 'volume') === 5, `원뿔 부피 ${lessonSummary(cone, 'volume')!.value}`)
  check(lessonSummary(cylinder, 'surface-area')!.value === '28π cm²' && lessonSummary(cylinder, 'surface-area')!.formula === '밑면 2 × 4π + 옆면 20π' && lessonSummary(cylinder, 'surface-area', 2, '3.14')!.value === '87.92 cm²', `원기둥 겉넓이 ${lessonSummary(cylinder, 'surface-area')!.value}`)
  check(lessonSummary(cone, 'surface-area')!.value === '24π cm²' && lessonSummary(round('cone', 3, 5), 'surface-area')!.value === '9π + 3√34π cm²', `원뿔 겉넓이 (모선 5) ${lessonSummary(cone, 'surface-area')!.value}`)
  check(lessonSummary(cone, 'similar')!.ratios![1].value === '1 : 2³' && lessonStepCount(cone, 'similar') === 4, '원뿔 닮음')
  for (const k of ['diagonal', 'shortest-path', 'edge-relations'] as const) check(lessonStepCount(cylinder, k) === 0, `원기둥 ${k} 없음`)
}

// 겉넓이 과정: 면 위 식, 재는 선, 단계 사이 합
{
  const solid = (shape: string, size: object) => ({ shape, size, vertexLabels: [], lines: [], net: { layout: 'default' } }) as unknown as ShapeScene
  const box = polyhedronOf({ shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } } as ShapeScene)!
  const steps = surfaceSteps(box)
  check(steps.length === 3 && steps[0].each === 12 && steps[0].legs.length === 2, `직육면체 첫 묶음 ${steps[0].text}`)
  check(steps[0].text.endsWith('= 12 cm²') && steps[0].legs.map((l) => l.length).sort().join() === '3,4', `식 ${steps[0].text}`)
  check(surfaceStepHint(steps, 1) === '4 × 3 = 12 cm². 2장이라 24, 지금까지 24 cm²', `안내 ${surfaceStepHint(steps, 1)}`)
  check(surfaceStepHint(steps, 2).endsWith('2장이라 16, 지금까지 40 cm²'), `안내 ${surfaceStepHint(steps, 2)}`)
  check(lessonHint({ kind: 'surface-area', progress: 1 / 3 }, { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } } as ShapeScene) === '가로 4칸 × 세로 3칸 = 12 cm². 2장이라 24, 지금까지 24 cm²', '단계 사이 안내')
  // 사각뿔 옆면: 밑변 3, 높이 √(4² + 1.5²) (빗면 높이), 넓이 = 밑변 × 높이 ÷ 2
  const pyramid = surfaceSteps(polyhedronOf(solid('pyramid', { sides: 4, edge: 3, height: 4 }))!)
  const side = pyramid.find((s) => s.count === 4)!
  check(Math.abs(side.legs[0].length - 3) < EPS && Math.abs(side.legs[1].length - Math.hypot(4, 1.5)) < 1e-9 && Math.abs((3 * side.legs[1].length) / 2 - side.each) < 1e-9, `사각뿔 옆면 ${side.text}`)
  check(pyramid.find((s) => s.count === 1)!.text === '3 × 3 = 9 cm²', '사각뿔 밑면')
  // 재는 선 끝이 면 위에: 수선의 발이 밑변 위, 정삼각형도 넓이가 맞는다
  const tetra = surfaceSteps(polyhedronOf(solid('regular-tetrahedron', { edge: 2 }))!)[0]
  check(Math.abs((tetra.legs[0].length * tetra.legs[1].length) / 2 - tetra.each) < 1e-9, `정사면체 ${tetra.text}`)
  const penta = surfaceSteps(polyhedronOf(solid('regular-dodecahedron', { edge: 2 }))!)[0]
  check(penta.text === '한 변 2 cm 인 오각형' && !penta.exact && penta.count === 12, `오각형 ${penta.text}`)
  // 원기둥·원뿔 (r = 3, h = 4, 모선 5)
  const round = curvedSurfaceSteps('cone', 3, 4)
  check(round.length === 3 && round[0].count === 1 && round[1].each === 0 && round[2].each === 15 && round[2].text === 'π × 모선 5 × 반지름 3 = 15π cm²', `원뿔 ${round[2].text}`)
  check(surfaceStepHint(round, 2).includes('모선 5 cm') && surfaceStepHint(round, 3).includes('3 ÷ 5'), '원뿔 멈춤 안내')
  const pipe = curvedSurfaceSteps('cylinder', 2, 5)
  check(surfaceStepHint(pipe, 1) === 'π × 2 × 2 = 4π cm². 2장이라 8π, 지금까지 8π cm²', `원기둥 안내 ${surfaceStepHint(pipe, 1)}`)
  check(pipe[1].text === '가로 4π × 높이 5 = 20π cm²', `원기둥 옆면 ${pipe[1].text}`)
  check(curvedSurfaceSteps('cylinder', 3, 5, '3.14')[1].text === '가로 18.84 × 높이 5 = 94.2 cm²', '3.14 표기')
  // 1×1 칸: 정수는 칸 수가 넓이, 2.5 는 끝 칸이 좁아도 넓이가 맞다
  const area = (cells: ReturnType<typeof tileCells>) => cells.reduce((sum, c) => sum + c.su * c.sv, 0)
  check(tileCells(4, 3).length === 12 && tileCells(4, 3).every((c) => c.su === 1 && c.sv === 1), '4×3 은 칸 12개')
  check(area(tileCells(2.5, 3)) === 7.5 && tileCells(2.5, 3).length === 9, '2.5×3 넓이 7.5')
  check(tileCells(4, 3)[4].v === 1.5 && tileCells(4, 3)[4].u === 0.5, '다음 줄로 올라간다')
  check(tileFormula(4, 3, 12) === '가로 4칸 × 세로 3칸 = 12 cm²' && tileFormula(2.5, 3, 7.5) === '2.5 × 3 = 7.5 cm²', '칸 식')
  check(lessonStepCount(round0('cone'), 'surface-area') === 4 && lessonStepCount(round0('cylinder'), 'surface-area') === 2, '곡면 겉넓이 단계')
  check(curvedSurfaceSteps('cylinder', 2, 5)[0].count === 2, '원기둥 밑면 2장')
}

// 뿔 물 붓기: 멈춘 자리에서 뿔은 제자리에 물이 찬 모습, 통은 ⅓씩. 물은 줄지 않고 늘기만 한다
{
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9
  check(pourState(0).level === 0 && pourState(0).lift === 0 && pourState(0).inside === 1, '시작')
  for (const k of [1, 2]) {
    const s = pourState(k / 3)
    check(near(s.level, k / 3) && s.lift === 0 && s.inside === 1 && s.flow === 0, `${k}번 붓고 멈춤 ${JSON.stringify(s)}`)
  }
  const end = pourState(1)
  check(end.level === 1 && end.inside === 0 && end.lift === 0, '세 번 부으면 가득, 뿔은 비었음')
  const mid = pourState(1 / 6)
  check(mid.lift === 1 && mid.tilt === 1 && mid.flow > 0 && mid.flow < 1, `붓는 중 ${JSON.stringify(mid)}`)
  let last = 0
  for (let i = 0; i <= 300; i++) {
    const { level } = pourState(i / 300)
    check(level >= last - 1e-9, `물이 줄어듦 ${i}`)
    last = level
  }
  // 안내: 세어 보는 말로
  const box = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } } as ShapeScene
  const cone = { shape: 'cone', size: { radius: 3, height: 4 }, vertexLabels: [null], lines: [], net: { layout: 'default' } } as unknown as ShapeScene
  check(lessonHint({ kind: 'volume', progress: 3 / 4 }, box) === '한 층에 작은 정육면체 8개 · 2층까지 16개', `상자 안내 ${lessonHint({ kind: 'volume', progress: 3 / 4 }, box)}`)
  check(lessonHint({ kind: 'volume', progress: 1 / 4 }, box) === '밑넓이 = 4 × 2 = 8 cm²', '밑면 먼저')
  check(lessonHint({ kind: 'volume', progress: 1 / 5 }, cone)!.startsWith('1번 부었어요. 통의 ⅓'), '원뿔 안내')
  check(lessonHint({ kind: 'volume', progress: 3 / 5 }, cone)!.includes('원기둥의 ⅓'), '원뿔 끝 안내')
  check(lessonSummary(cone, 'volume')!.formula === '밑넓이 9π × 높이 4 ÷ 3', `원뿔 식 ${lessonSummary(cone, 'volume')!.formula}`)
  check(piValue(1, 'pi') === 'π' && piValue(6, '3.14') === '18.84' && slantText(3, 4) === '5' && slantText(3, 5) === '√34', '표기')
}

// 모서리 길이 글자: 입체는 가로·세로·높이, 전개도 면은 그 면의 이웃한 두 변
{
  check(boxLengthLabels({ width: 4, depth: 2, height: 3.5 }).map((l) => l.text).join() === '4 cm,2 cm,3.5 cm', '입체 길이 글자')
  check(computedLengthText(5) === '5 cm' && computedLengthText(Math.hypot(4, 2)) === '약 4.47 cm', '계산한 길이 글자')
  const poly = polyhedronOf({ shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } } as ShapeScene)!
  check(poly.faces.every((_, f) => faceLengthLabels(poly, f).length === 2), '면마다 글자 둘')
  check(faceLengthLabels(poly, 0).map((l) => l.text).sort().join() === '3 cm,4 cm', `앞면 글자 ${faceLengthLabels(poly, 0).map((l) => l.text)}`)
}

console.log('ok: 설명 모드 (다른 전개도로 접은 입체 포함, 모서리 길이 글자, 부피 조각 배치, 층 진행률, 겉넓이 면 쌍·넓이, 피타고라스 대각선·최단 거리, 위치 관계, 닮음, 단계 수, 공식, 안내)')
