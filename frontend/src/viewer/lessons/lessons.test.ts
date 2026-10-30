// 설명 모드 검사: 부피 조각 배치와 단계 수, 공식. 실행: `npm test` (= node src/viewer/lessons/lessons.test.ts)
import type { ShapeScene } from '../../shared/types.ts'
import { polyhedronOf } from '../polyhedra.ts'
import { lessonHint, lessonStepCount, lessonSummary } from './data.ts'
import { defaultEdge, edgeRelations, edgesOf, meetPoint } from './edgeRelationsLayout.ts'
import { diagonalLayout, shortestRoutes } from './pythagorasLayout.ts'
import { faceArea, faceNormal, oppositeFacePairs } from './surfaceLayout.ts'
import { layerProgress, volumeLayout } from './volumeLayout.ts'

const EPS = 1e-9
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
}

// 단계 수와 공식
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const cube: ShapeScene = { shape: 'cube', size: { edge: 2.5 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const cylinder: ShapeScene = { shape: 'cylinder', size: { radius: 1, height: 2 }, vertexLabels: [], lines: [], net: { layout: 'default' } }
  check(lessonStepCount(cuboid, 'volume') === 3 && lessonStepCount(cube, 'volume') === 3, '층 수 = 높이를 올림한 값')
  check(lessonStepCount(cylinder, 'volume') === 0 && lessonSummary(cylinder, 'volume') === null, '원기둥은 아직 설명 없음')
  const s = lessonSummary(cuboid, 'volume')!
  check(s.formula === '가로 × 세로 × 높이 = 4 × 2 × 3' && s.value === '24', `공식 문구, 실제 ${s.formula} = ${s.value}`)
  check(lessonSummary(cube, 'volume')!.value === '15.63', '소수는 둘째 자리까지')
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
  check(lessonStepCount(cuboid, 'surface-area') === 3, '겉넓이 단계 = 쌍 3개')
  const s = lessonSummary(cuboid, 'surface-area')!
  check(s.formula === '2 × (12 + 6 + 8) = 2 × 26' && s.value === '52', `겉넓이 공식, 실제 ${s.formula} = ${s.value}`)
}

// 피타고라스 (TODO-30): 입체 대각선, 겉면 최단 거리 후보와 직각삼각형
{
  const cuboid: ShapeScene = { shape: 'cuboid', size: { width: 4, depth: 2, height: 3 }, vertexLabels: Array(8).fill(null), lines: [], net: { layout: 'cross' } }
  const L = diagonalLayout({ width: 4, depth: 2, height: 3 })
  check(Math.abs(L.base - Math.sqrt(20)) < EPS && Math.abs(L.space - Math.sqrt(29)) < EPS, '4×2×3 밑면 대각선 √20, 입체 대각선 √29')
  check(lessonStepCount(cuboid, 'diagonal') === 3, '대각선 단계 = 3')
  const s = lessonSummary(cuboid, 'diagonal')!
  check(s.formula === '√(4² + 2² + 3²) = √29' && s.value === '약 5.39', `대각선 공식, 실제 ${s.formula} = ${s.value}`)

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

console.log('ok: 설명 모드 (부피 조각 배치, 층 진행률, 겉넓이 면 쌍·넓이, 피타고라스 대각선·최단 거리, 위치 관계, 단계 수, 공식, 안내)')
