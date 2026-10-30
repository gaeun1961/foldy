// 설명 모드 검사: 부피 조각 배치와 단계 수, 공식. 실행: `npm test` (= node src/viewer/lessons/lessons.test.ts)
import type { ShapeScene } from '../../shared/types.ts'
import { lessonStepCount, lessonSummary } from './data.ts'
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

console.log('ok: 설명 모드 (부피 조각 배치, 층 진행률, 단계 수, 공식)')
