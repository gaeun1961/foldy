// 설명 모드(공식 시각화)의 데이터 쪽: 종류, 자세, 단계 수, 멈춘 뒤 보여줄 공식. 화면 물체는 만들지 않는다 (docs/specs/viewer.md "설명 모드").
// 새 설명은 LessonKind 와 아래 표들에 한 줄씩 더한다
import type { EdgeSize, ShapeScene } from '../../shared/types.ts'
import type { BookResult as LessonResult } from '../bookScene.ts'
import { netCheck, polyhedronOf, type Polyhedron } from '../polyhedra.ts'
import { defaultEdge, edgeRelations, edgesOf } from './edgeRelationsLayout.ts'
import { diagonalLayout, shortestRoutes } from './pythagorasLayout.ts'
import { generalFormula } from './formulas.ts'
import { prismHints, regularPlan, revolutionMeasure, slantPlan, surd, threadPlan } from './regularLayout.ts'
import { polySectionName } from './polySection.ts'
import { sectionName } from './revolveLayout.ts'
import { similarSteps } from './similarLayout.ts'
import { curvedSurfaceSteps, faceArea, polygonWord, surfaceGroups, surfaceStepHint, surfaceSteps, type CountStep } from './surfaceLayout.ts'
import { isExact, piValue, slantText, type PiMode } from './lengthLabels.ts'
import { pieces, STAIR_LAYERS, stairRatio, volumeLayout } from './volumeLayout.ts'

export type { PiMode }

export type LessonKind = 'volume' | 'surface-area' | 'diagonal' | 'shortest-path' | 'edge-relations' | 'similar' | 'counts' | 'sphere-section' | 'thread' | 'revolve' | 'section' | 'revolve-net' | 'revolve-area' | 'revolve-volume'

export interface Lesson {
  kind: LessonKind
  progress: number // 0 = 시작 전, 1 = 다 보여줌. 단계·속도·멈춤은 UI 가 이 값을 바꿔서 만든다 (접기의 unfold 와 같은 방식)
  scale?: number // 닮음비 k (닮음만, 기본 2). 바뀌면 설명 물체를 새로 만든다
  pi?: PiMode // 원이 들어간 값의 표기 (기본 π 그대로, 아래 바에서 초등 3.14)
  layers?: number // 원뿔 부피 마지막 단계의 원판 수 (STAIR_LAYERS, 기본 4)
  cut?: number // 자르는 높이 h ÷ r (구 단면 비교, 회전체 단면. 0~1, 기본 ½)
  cutKind?: 'vertical' | 'horizontal' | 'tilted' // 회전체 단면의 방향 (기본 세로)
}

const scaleOf = (lesson: { scale?: number }) => lesson.scale ?? 2

export const LESSON_LABEL: Record<LessonKind, string> = { volume: '부피', 'surface-area': '겉넓이', diagonal: '대각선', 'shortest-path': '최단 거리', 'edge-relations': '위치 관계', similar: '닮음', counts: '개수', 'sphere-section': '단면 비교', thread: '실 감기', revolve: '회전체', section: '단면', 'revolve-net': '전개도', 'revolve-area': '겉넓이', 'revolve-volume': '부피' }

// 화면 위에 작게 쓰는 학년 표시. 각뿔·원뿔·삼각기둥 겉넓이는 피타고라스 단계를 볼 때만
export function lessonGrade(lesson: Lesson, scene: ShapeScene) {
  const pythagoras = '중3 · 피타고라스 활용'
  if (lesson.kind === 'sphere-section') return '중2 이상 · 심화'
  if (lesson.kind === 'revolve' || lesson.kind === 'section' || lesson.kind === 'revolve-net') return '중1'
  if (lesson.kind === 'diagonal' || lesson.kind === 'shortest-path' || lesson.kind === 'thread') return pythagoras
  if (isRegular(scene)) return lesson.kind === 'counts' ? '중1' : pythagoras
  return lesson.kind === 'surface-area' && slantPlan(scene) && lesson.progress <= 1 / lessonStepCount(scene, lesson.kind) + 1e-6 ? pythagoras : null
}

// 어느 자세에서 보여주는지: 'solid' 는 바로 세운 입체(unfold 0), 'net' 은 바닥에 펼친 전개도(unfold 1)
export const LESSON_POSE: Record<LessonKind, 'solid' | 'net'> = { volume: 'solid', 'surface-area': 'solid', diagonal: 'solid', 'shortest-path': 'net', 'edge-relations': 'solid', similar: 'solid', counts: 'solid', 'sphere-section': 'solid', thread: 'solid', revolve: 'solid', section: 'solid', 'revolve-net': 'solid', 'revolve-area': 'solid', 'revolve-volume': 'solid' }

const isRegular = (scene: ShapeScene) => scene.shape.startsWith('regular-')

// 도형별 탭: 교과서에서 실제로 배우는 것만 (ui.md 공식 시각화 규칙). 닮음·최단 거리는 직육면체·정육면체에만
export function lessonTabs(scene: ShapeScene): LessonKind[] {
  if (boxSizeOf(scene)) return ['surface-area', 'volume', 'edge-relations', 'diagonal', 'similar', 'shortest-path', 'section']
  if (scene.shape === 'cylinder') return ['surface-area', 'volume', 'thread', 'revolve', 'section']
  if (scene.shape === 'cone' || scene.shape === 'sphere') return ['surface-area', 'volume', 'revolve', 'section']
  if (scene.shape === 'revolution') return ['revolve', 'section', 'revolve-net', 'revolve-area', 'revolve-volume']
  return isRegular(scene) ? ['counts', 'surface-area', 'volume', 'section'] : ['surface-area', 'volume', 'section']
}

// 정다면체 겉넓이·부피의 식 (regularLayout.ts). 정다면체가 아니면 null
export const planOf = (scene: ShapeScene) => (isRegular(scene) ? regularPlan(scene.shape, (scene.size as EdgeSize).edge) : null)

// 면·모서리·꼭짓점 수
const countsOf = (poly: Polyhedron): [string, number][] => [['면', poly.faces.length], ['모서리', edgesOf(poly).length], ['꼭짓점', poly.positions.length]]

// 시작 전 3D 뷰 아래 안내 한 줄 (ui.md 안내 문구). 피타고라스는 보기 전에 먼저 어림해 보게 묻는다 (리포트 T30 참고 자료)
export const LESSON_HINT: Record<LessonKind, string> = {
  volume: '1 cm 정육면체를 한 층씩 쌓아 볼까요',
  'surface-area': '같은 모양 면끼리 칠해 볼까요',
  diagonal: '밑면 대각선과 입체 대각선, 어느 쪽이 더 길까요?',
  'shortest-path': '꼭짓점에서 반대쪽 꼭짓점까지, 어느 길이 더 짧을까요?',
  'edge-relations': '빨간 모서리와 다른 모서리는 어떤 사이일까요? 다른 모서리를 눌러 바꿀 수 있어요',
  similar: '모서리를 늘리면 겉넓이와 부피는 몇 배가 될까요?',
  counts: '면, 모서리, 꼭짓점을 하나씩 켜며 세어 볼까요',
  revolve: '이 평면도형을 빨간 축으로 돌리면 어떤 입체가 될까요?',
  section: '입체를 평면으로 자르면 어떤 모양이 나올까요?',
  'revolve-net': '옆면을 펴면 어떤 모양일까요?',
  'revolve-area': '',
  'revolve-volume': '',
  thread: '실을 감은 가장 짧은 길은 어떤 모양일까요?',
  'sphere-section': '바닥과 높이가 같은 두 도형이에요. 어느 높이에서 잘라도 단면 넓이가 같을까요?',
}

// 부피 설명 (왼쪽 쪽, 초5~중1): 쌓는 도형은 밑넓이 → 한 층의 양과 지금까지의 합, 뿔은 물 붓기 실험. undefined 면 기본 안내
function volumeHint(scene: ShapeScene, progress: number, mode: PiMode, stair = STAIR_LAYERS[0] as number): string | null | undefined {
  if (scene.shape === 'cone' || scene.shape === 'pyramid') {
    const [cone, cup] = scene.shape === 'cone' ? ['원뿔', '원기둥'] : ['각뿔', '각기둥']
    if (progress <= 0) return `${cone}에 물을 가득 담아, 밑면과 높이가 같은 ${cup} 통에 부어 봐요. 몇 번 부으면 가득 찰까요?`
    const pourSteps = scene.shape === 'pyramid' && scene.size.sides !== 4 ? 3 : 5
    const ratio = scene.shape === 'cone' ? `원판 ${stair}층 ÷ 원기둥 = ${stairRatio(stair, scene.size.radius, scene.size.height).toFixed(3)}. 층이 많아질수록 ⅓(0.333…)에 가까워져요` : ''
    if (progress >= 1 && pourSteps === 3) return `세 번 부으니 딱 찼어요. 그래서 ${cone}의 부피는 ${cup}의 ⅓이에요`
    if (progress >= 1) return scene.shape === 'cone' ? `판을 옆으로 밀어 꼭대기를 옮겨도 판의 크기와 개수가 그대로라 부피는 같아요. ${ratio}` : '이런 사각뿔 3개가 정육면체를 빈틈없이 채워요. 사각뿔 1개 = 정육면체의 ⅓'
    const at = progress * pourSteps
    if (Math.abs(at - Math.round(at)) > 1e-6) return null
    if (Math.round(at) === 4 && scene.shape === 'cone') return ratio
    if (Math.round(at) === 4) return '밑면과 높이가 그대로면 꼭대기를 옮겨도 부피는 같아요. 꼭대기를 밑면 꼭짓점 바로 위로 옮겼어요'
    if (Math.round(at) === 3) return `세 번 부으니 딱 찼어요. 그래서 ${cone}의 부피는 ${cup}의 ⅓이에요. 왜 그럴까요?`
    return `${Math.round(at)}번 부었어요. 통의 ${Math.round(at) === 1 ? '⅓' : '⅔'}까지 찼어요. 물을 다시 담았어요`
  }
  const box = boxSizeOf(scene)
  const cylinder = scene.shape === 'cylinder' ? scene.size : null
  const prism = scene.shape === 'prism' ? scene.size : null
  if (!box && !cylinder && !prism) return undefined // 정다면체
  const height = box?.height ?? cylinder?.height ?? prism!.height
  const layers = pieces(height).length
  // 각기둥: 판을 다 쌓은 뒤 맨 위 면에서 밑넓이를 구한다
  if (prism) {
    if (progress <= 0) return '두께 1 cm 인 판을 한 층씩 쌓아 볼까요'
    const at = progress * (layers + 1)
    if (Math.abs(at - Math.round(at)) > 1e-6) return null
    if (Math.round(at) <= layers) return `한 층 = 밑넓이 × 1 · ${Math.round(at)}층까지 밑넓이 × ${Math.round(at)}`
    return slantPlan(scene)?.hint ?? prismHints(prism.sides, prism.edge, prism.height)[0]
  }
  if (progress <= 0) return box ? LESSON_HINT.volume : '먼저 밑면을 칠하고, 두께 1 cm 인 판을 한 층씩 쌓아 볼까요'
  if (progress >= 1) return '한 층의 양 × 층 수 = 부피예요'
  const at = progress * (layers + 1)
  if (Math.abs(at - Math.round(at)) > 1e-6) return null
  const done = Math.round(at) - 1 // 0 이면 밑면만 칠한 때
  // 넓이 표기: 원기둥은 π, 각기둥은 딱 떨어질 때만 숫자
  const area = box ? box.width * box.depth : cylinder ? cylinder.radius ** 2 : polygonArea(prism!)
  const show = (n: number) => (cylinder ? piValue(n, mode) : num(n))
  if (done === 0) return box ? `밑넓이 = ${num(box.width)} × ${num(box.depth)} = ${num(area)} cm²` : cylinder ? `밑넓이 = ${mode === 'pi' ? 'π' : '3.14'} × ${num(cylinder.radius)} × ${num(cylinder.radius)} = ${show(area)} cm²` : `밑넓이 = ${num(area)} cm²`
  if (box && Number.isInteger(area)) return `한 층에 작은 정육면체 ${area}개 · ${done}층까지 ${area * done}개`
  return `한 층 = 밑넓이 ${show(area)} × 두께 1 · ${done}층까지 ${show(area * done)} cm³`
}

// 회전체: 평면도형, 된 입체, 세로 단면, 옆면을 편 모양
const REVOLUTION_WORDS: Record<string, [string, string, string]> = {
  rectangle: ['직사각형', '원기둥이', '직사각형'],
  'right-triangle': ['직각삼각형', '원뿔이', '부채꼴'],
  semicircle: ['반원', '구가', ''],
  trapezoid: ['사다리꼴', '원뿔대가', '부채꼴에서 작은 부채꼴을 뺀 모양'],
}

// 단면 모양의 이름: 곡면 도형은 돌린 도형으로 계산하고, 다면체는 다각형을 판별한다
export function sectionShapeName(scene: ShapeScene, kind: 'vertical' | 'horizontal' | 'tilted', cut: number) {
  if (scene.shape === 'revolution') return sectionName(scene.size, kind, cut)
  if (scene.shape === 'sphere') return sectionName({ figure: 'semicircle', radius: scene.size.radius, height: 2 * scene.size.radius, gap: 0 }, kind, cut)
  if (scene.shape === 'cylinder' || scene.shape === 'cone') return sectionName({ figure: scene.shape === 'cylinder' ? 'rectangle' : 'right-triangle', radius: scene.size.radius, height: scene.size.height, gap: 0 }, kind, cut)
  const poly = polyhedronOf(scene)
  return poly ? polySectionName(poly, kind, cut) : null
}
const endsWithBatchim = (word: string) => (word.charCodeAt(word.length - 1) - 0xac00) % 28 !== 0

// 구: 겉넓이는 실 감기, 부피는 통에 붓기 (sphereLessons.ts)
function sphereHint({ kind, progress, pi = 'pi' }: Lesson, r: number) {
  if (kind === 'sphere-section') return progress <= 0 ? LESSON_HINT[kind] : null // 그 뒤의 글은 pageResult.lines
  const name = pi === 'pi' ? 'π' : '3.14'
  const steps = kind === 'surface-area' ? 3 : 2
  const at = progress * steps
  if (Math.abs(at - Math.round(at)) > 1e-6) return null
  const words =
    kind === 'surface-area'
      ? ['구의 겉면을 덮으려면 반지름이 같은 원이 몇 개 있어야 할까요?', `가운데를 자른 원의 넓이 = ${name} × ${num(r)} × ${num(r)} = ${piValue(r * r, pi)} cm²`, '구에 실을 빈틈없이 감았어요', '실을 풀어 보니 같은 원 4개가 꼭 찼어요']
      : ['구가 꼭 들어가는 원기둥 통이 있어요. 구에 담은 물을 부으면 통이 얼마나 찰까요?', `통은 반지름 ${num(r)} cm, 높이 ${num(2 * r)} cm. 통의 부피 = ${piValue(r * r, pi)} × ${num(2 * r)} = ${piValue(2 * r ** 3, pi)} cm³`, '통의 ⅔까지 찼어요. 구의 부피는 통의 ⅔예요']
  return words[Math.round(at)]
}

// 구 부피의 계수 4r³/3: 딱 떨어지면 그대로, 아니면 분수 (π 일 때) 또는 약 (3.14 일 때)
function sphereVolume(r: number, mode: PiMode) {
  const coef = (4 * r ** 3) / 3
  return isExact(coef) ? piValue(coef, mode) : mode === 'pi' ? `${num(4 * r ** 3)}π/3` : `약 ${num(coef * 3.14)}`
}

// 멈춰 있을 때 왼쪽 쪽 설명 (ui.md 공식 시각화 규칙). 시작 전에는 LESSON_HINT, 위치 관계는 꼬인 위치를 보기 직전(만남까지 보고 멈춤)에
// "만나지 않으면 평행일까?"를 물어 평면에서 배운 정의와 부딪히게 한다 (리포트 T28 참고 자료). 그 밖에는 없음
// 닮음은 시작 전에 몇 배인지 먼저 어림하게 하고, 부피 직전(한 면까지 보고 멈춤)에 다시 묻고, 끝나면 모서리 길이의 합을 물어
// "넓이·부피가 k²·k³ 배니까 다 그렇겠지"라는 과잉 일반화를 점검한다 (리포트 T29 참고 자료)
export function lessonHint(lesson: Lesson, scene?: ShapeScene): string | null {
  if (lesson.kind === 'section' && scene && lesson.progress > 0) {
    if (lesson.progress < 1) return null
    const kind = lesson.cutKind ?? 'vertical'
    const name = sectionShapeName(scene, kind, lesson.cut ?? 0.5)
    if (!name) return '이 높이에서는 잘리는 부분이 없어요'
    return `${{ vertical: '세로로', horizontal: '가로로', tilted: '비스듬히' }[kind]} 자르면 ${name}${endsWithBatchim(name) ? '이에요' : '예요'}`
  }
  if (scene?.shape === 'revolution' && lesson.progress > 0) {
    if (lesson.progress < 1 || lesson.kind === 'revolve-area' || lesson.kind === 'revolve-volume') return null // 움직이는 동안에는 글이 없다
    const { figure, gap } = scene.size
    const [from, to, flat] = REVOLUTION_WORDS[figure]
    if (lesson.kind === 'revolve') return gap > 0 ? `${from}을 축에서 떨어뜨려 돌렸더니 가운데가 뚫린 입체가 됐어요` : `${from}을 한 바퀴 돌렸더니 ${to} 됐어요`
    if (lesson.kind === 'revolve-net') return `옆면을 펴니 ${flat}이에요`
  }
  if (lesson.kind === 'revolve' && lesson.progress > 0) {
    // 돌리는 동안에는 글이 없다. 다 돌리면 무엇이 되었는지
    const [from, to] = scene?.shape === 'cylinder' ? ['직사각형', '원기둥이'] : scene?.shape === 'cone' ? ['직각삼각형', '원뿔이'] : ['반원', '구가']
    return lesson.progress >= 1 ? `${from}을 한 바퀴 돌렸더니 ${to} 됐어요` : null
  }
  if (scene?.shape === 'sphere') return sphereHint(lesson, scene.size.radius)
  if (lesson.kind === 'thread' && scene?.shape === 'cylinder' && lesson.progress > 0) {
    const at = lesson.progress * 3
    return Math.abs(at - Math.round(at)) < 1e-6 ? threadPlan(scene.size.radius, scene.size.height, lesson.pi ?? 'pi').hints[Math.round(at) - 1] : null
  }
  const plan = scene && planOf(scene)
  if (plan && (lesson.kind === 'surface-area' || lesson.kind === 'volume')) {
    const hints = lesson.kind === 'surface-area' ? plan.areaHints : plan.volume?.hints
    if (!hints) return null
    if (lesson.progress <= 0) return lesson.kind === 'surface-area' ? '면 하나의 넓이부터 구해 볼까요' : '입체 안의 직각삼각형으로 높이를 구해 볼까요'
    const at = lesson.progress * hints.length
    return Math.abs(at - Math.round(at)) < 1e-6 ? hints[Math.round(at) - 1] : null
  }
  // 겉넓이: 면 사이에 멈추면 그 면의 식과 지금까지의 합. 전체 합 식은 끝난 뒤 결과로 (원뿔은 마지막 설명도)
  if (lesson.kind === 'surface-area' && scene && lesson.progress > 0) {
    const poly = polyhedronOf(scene)
    const steps: CountStep[] = scene.shape === 'cylinder' || scene.shape === 'cone' ? curvedSurfaceSteps(scene.shape, scene.size.radius, scene.size.height, lesson.pi) : poly ? surfaceSteps(poly, !!boxSizeOf(scene)) : []
    if (!steps.length) return null
    const slant = slantPlan(scene)
    if (scene.shape === 'prism') {
      steps.length = 0
      for (const hint of prismHints(scene.size.sides, scene.size.edge, scene.size.height)) steps.push({ count: 1, each: 0, text: '', hint })
    }
    if (scene.shape === 'pyramid') {
      // 옆면 묶음: 같은 삼각형을 붙이면 직사각형, 그 반. 마지막 묶음이어도 끝까지 보이게 hint 로
      surfaceSteps(poly!).forEach((step, k) => {
        if (poly!.faces[step.face].vertices.length === 3) steps[k].hint = step.exact ? `같은 삼각형을 붙이면 직사각형이에요. 그 반이라 ${step.text}` : '같은 삼각형을 붙이면 밑변 × 높이 직사각형이에요. 옆면은 그 반이에요'
      })
    }
    if (slant) steps.unshift({ count: 1, each: 0, text: '', hint: slant.hint })
    if (lesson.progress >= 1) return steps[steps.length - 1].hint ?? null
    const at = lesson.progress * steps.length
    return Math.abs(at - Math.round(at)) < 1e-6 ? surfaceStepHint(steps, Math.round(at)) : null
  }
  if (lesson.kind === 'counts' && scene && lesson.progress > 0) {
    const poly = polyhedronOf(scene)
    const at = lesson.progress * 3
    if (!poly || lesson.progress >= 1 || Math.abs(at - Math.round(at)) > 1e-6) return null
    const [name, n] = countsOf(poly)[Math.round(at) - 1]
    return `${name}${name === '모서리' ? '가' : '이'} ${n}개예요`
  }
  if (lesson.kind === 'volume' && scene) {
    const hint = volumeHint(scene, lesson.progress, lesson.pi ?? 'pi', lesson.layers)
    if (hint !== undefined) return hint
  }
  if (lesson.kind === 'similar') {
    const k = scaleOf(lesson)
    if (lesson.progress <= 0) return `모서리를 ${k}배로 늘리면 겉넓이와 부피는 몇 배가 될까요?`
    if (Math.abs(lesson.progress - 2 / similarSteps(k)) < 1e-6) return `한 면은 ${k * k}배였어요. 부피는 몇 배일까요?`
    if (lesson.progress >= 1) return '그럼 모서리 길이를 모두 더한 것은 몇 배일까요?'
    return null
  }
  if (lesson.progress <= 0) return LESSON_HINT[lesson.kind]
  if (lesson.kind === 'edge-relations' && Math.abs(lesson.progress - 2 / 3) < 1e-6) return '남은 모서리는 빨간 모서리와 만나지 않아요. 그럼 평행일까요?'
  return null
}

// 설명을 보여줄 수 있는 도형의 가로·세로·높이. 지금은 직육면체·정육면체만
// 전개도(grid)로 접은 입체는 바닥 면 기준으로 접혀서 가운데가 원점이 아니고 가로·세로·높이 방향도 달라질 수 있다.
// 그래서 실제 꼭짓점에서 구한다. 닫히지 않는 잘못된 전개도는 상자가 아니므로 null
export function boxSizeOf(scene: ShapeScene) {
  if (scene.shape !== 'cuboid' && scene.shape !== 'cube') return null
  if (scene.net.layout === 'grid') {
    if (!netCheck(scene)?.closed) return null
    const { lo, hi } = extent(scene)
    const len = (k: number) => Math.round((hi[k] - lo[k]) * 1e6) / 1e6 // 접을 때 생긴 소수 오차 (조각 수가 늘지 않게)
    return { width: len(0), height: len(1), depth: len(2) }
  }
  if (scene.shape === 'cuboid') return scene.size
  return { width: scene.size.edge, depth: scene.size.edge, height: scene.size.edge }
}

// 꼭짓점 좌표의 범위
function extent(scene: ShapeScene) {
  const pts = polyhedronOf(scene)!.positions
  const axis = (f: (...v: number[]) => number) => [0, 1, 2].map((k) => f(...pts.map((p) => p[k])))
  return { lo: axis(Math.min), hi: axis(Math.max) }
}

// 입체 가운데 (접힌 좌표). 상자 치수로 그리는 설명(부피·대각선·닮음)을 이 자리에 놓는다. 치수로 만든 도형은 원점
export function boxCenterOf(scene: ShapeScene): [number, number, number] {
  if (scene.net.layout !== 'grid') return [0, 0, 0]
  const { lo, hi } = extent(scene)
  return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]
}

// 단계 수. 설명할 수 없는 도형이면 0. 접어서 닫히는 다면체만. 겉넓이·위치 관계·닮음·부피는 모든 다면체, 대각선·최단 거리는 상자만
export function lessonStepCount(scene: ShapeScene, kind: LessonKind, scale = 2) {
  if (scene.shape === 'revolution') {
    const { figure, gap } = scene.size
    if (kind === 'revolve' || kind === 'section') return 1
    if (kind === 'revolve-net') return gap === 0 && figure !== 'semicircle' ? 1 : 0 // 전개도는 축에 붙은 도형만, 구는 전개도가 없다
    return (kind === 'revolve-area' || kind === 'revolve-volume') && revolutionMeasure(scene.size) ? 1 : 0
  }
  if (kind === 'revolve') return scene.shape === 'cylinder' || scene.shape === 'cone' || scene.shape === 'sphere' ? 1 : 0 // 돌리기
  if (kind === 'section') return scene.shape === 'cylinder' || scene.shape === 'cone' || scene.shape === 'sphere' || netCheck(scene)?.closed ? 1 : 0 // 곡면 도형이나 닫히는 다면체
  if (scene.shape === 'sphere') return kind === 'surface-area' ? 3 : kind === 'volume' ? 2 : kind === 'sphere-section' ? 1 : 0
  // 곡면 도형: 겉넓이(밑면 → 옆면), 부피, 닮음 (curvedLessons.ts)
  if (scene.shape === 'cylinder' || scene.shape === 'cone') {
    if (kind === 'thread') return scene.shape === 'cylinder' ? 3 : 0 // 감기, 펴기, 길이
    if (kind === 'surface-area') return scene.shape === 'cone' ? 4 : 2 // 원기둥: 밑면, 옆면. 원뿔: 모선 구하기, 밑면, 옆면 펼치기, 큰 원의 비율
    if (kind === 'similar') return similarSteps(scale)
    if (kind === 'volume') return scene.shape === 'cone' ? 5 : pieces(scene.size.height).length + 1 // 원뿔: 세 번 붓기 + 원판 계단 + 판 밀기. 원기둥: 밑면 칠하기 + 층
    return 0
  }
  const poly = polyhedronOf(scene)
  if (!poly || !netCheck(scene)?.closed) return 0
  if (isRegular(scene)) {
    const plan = planOf(scene)!
    return kind === 'counts' ? 3 : kind === 'surface-area' ? plan.areaHints.length : kind === 'volume' ? (plan.volume?.hints.length ?? 0) : 0
  }
  const box = boxSizeOf(scene)
  if (kind === 'surface-area') return (scene.shape === 'prism' ? 2 : surfaceGroups(poly).length) + (slantPlan(scene) ? 1 : 0)
  if (kind === 'edge-relations') return 3 // 평행, 만남, 꼬인 위치
  if (kind === 'similar') return similarSteps(scale) // 길이, 한 면, 부피 k 층
  if (kind === 'volume') {
    if (box) return volumeLayout(box.width, box.depth, box.height).layers + 1 // 밑면 칠하기 + 층
    if (scene.shape === 'prism') return pieces(scene.size.height).length + 1
    if (scene.shape === 'pyramid') return scene.size.sides === 4 ? 5 : 3 // 세 번 붓기. 사각뿔은 꼭대기 옮기기 + 합치기까지
  }
  if (!box) return 0
  if (kind === 'diagonal') return 3 // 밑면 삼각형, 세운 삼각형, 입체 대각선
  if (kind === 'shortest-path') return shortestRoutes(poly).length * 2 // 길마다 선, 직각삼각형
  return 0
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))
// 값: 딱 떨어지지 않으면 약
const approx = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : `약 ${num(n)}`)
const near = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : n)
// √x: 제곱수면 정수, 정수면 √29, 소수면 어림값
const root = (x: number) => {
  const s = near(Math.sqrt(x))
  if (Number.isInteger(s)) return String(s)
  return Number.isInteger(near(x)) ? `√${near(x)}` : num(s)
}
const leg = (parts: number[]) => (parts.length > 1 ? `(${parts.map(num).join(' + ')})²` : `${num(parts[0])}²`)

// 애니메이션이 멈춘 뒤 보여줄 식과 값 (ui.md 친절한 설명 원칙: 글은 멈춘 뒤에)
// 닮음 결과: 닮음비 아래에 겉넓이비·부피비. 강조는 제곱·세제곱, 계산한 값은 옆에 작게
const similarResult = (k: number): LessonResult => ({
  formula: `닮음비 1 : ${k}`,
  ratios: [
    { label: '겉넓이비', value: `1 : ${k}²`, note: `= 1 : ${k * k}` },
    { label: '부피비', value: `1 : ${k}³`, note: `= 1 : ${k ** 3}` },
  ],
})

// 겉넓이에서 피타고라스로 구한 값: 그 단계를 지나도 왼쪽 쪽에 남긴다
export function lessonNote(lesson: Lesson, scene: ShapeScene) {
  if (lesson.kind !== 'surface-area') return null
  const plan = planOf(scene)
  if (plan) return plan.height && lesson.progress * plan.areaHints.length > 2 + 1e-6 ? plan.areaHints[1] : null
  const slant = slantPlan(scene)
  return slant && lesson.progress * lessonStepCount(scene, 'surface-area') > 1 + 1e-6 ? slant.hint : null
}

// 구 단면 비교의 왼쪽 쪽 글 (ui.md 공식 시각화 규칙). 두 넓이 줄에는 지금 높이의 값을 같이 쓴다. 심화는 중등 내용이라 늘 π 그대로
export const CONE_THIRD_LINK = 'cone-third'
export function sphereSectionLines(r: number, cut: number) {
  const coef = r * r * (1 - cut * cut)
  const area = coef > 1e-9 ? piValue(coef, 'pi') : '0'
  return [
    { text: '단면 반지름² = r² − h²' },
    { text: `반구 단면 = π(r² − h²) = ${area}` },
    { text: `고리 = πr² − πh² = π(r² − h²) = ${area}` },
    { text: '어느 높이에서 잘라도 넓이가 같아요 → 두 도형의 부피가 같아요' },
    { text: '반구 = 원기둥 − 원뿔 = πr³ − ⅓πr³ = ⅔πr³', link: { id: CONE_THIRD_LINK, label: '⅓ 왜?' } },
    { text: '구 = 반구 × 2 = ⁴⁄₃πr³' },
  ]
}

export function lessonSummary(scene: ShapeScene, kind: LessonKind, scale = 2, mode: PiMode = 'pi', cut = 0.5): LessonResult | null {
  if (scene.shape === 'revolution') {
    const measure = revolutionMeasure(scene.size)
    return measure && kind === 'revolve-area' ? { formula: '', lines: measure.area } : measure && kind === 'revolve-volume' ? { formula: '', lines: measure.volume } : null
  }
  if (scene.shape === 'sphere' && kind === 'sphere-section') return { formula: '', lines: sphereSectionLines(scene.size.radius, cut) }
  const result = summaryOf(scene, kind, scale, mode)
  const general = generalFormula(scene.shape, kind, mode)
  return result && general ? { ...result, general } : result
}

function summaryOf(scene: ShapeScene, kind: LessonKind, scale: number, mode: PiMode): LessonResult | null {
  if (scene.shape === 'sphere') {
    const r = scene.size.radius
    if (kind === 'surface-area') return { formula: `4 × ${piValue(r * r, mode)}`, value: `${piValue(4 * r * r, mode)} cm²` }
    return kind === 'volume' ? { formula: `⅔ × 통의 부피 ${piValue(2 * r ** 3, mode)}`, value: `${sphereVolume(r, mode)} cm³` } : null
  }
  if (scene.shape === 'cylinder' || scene.shape === 'cone') {
    const { radius: r, height: h } = scene.size
    if (kind === 'thread' && scene.shape === 'cylinder') return threadPlan(r, h, mode).result
    const cone = scene.shape === 'cone'
    const show = (n: number) => piValue(n, mode)
    if (kind === 'volume') return { formula: `밑넓이 ${show(r * r)} × 높이 ${num(h)}${cone ? ' ÷ 3' : ''}`, value: `${show((r * r * h) / (cone ? 3 : 1))} cm³` }
    if (kind === 'surface-area') {
      if (!cone) return { formula: `밑면 2 × ${show(r * r)} + 옆면 ${show(2 * r * h)}`, value: `${show(2 * r * (r + h))} cm²` }
      const L = Math.hypot(r, h)
      if (isExact(L) || mode !== 'pi') return { formula: `밑면 ${show(r * r)} + 옆면 ${show(r * L)}`, value: `${isExact(L) ? '' : '약 '}${show(r * (r + L))} cm²` }
      const side = `${num(r)}${slantText(r, h)}π`
      return { formula: `밑면 ${show(r * r)} + 옆면 ${side}`, value: `${show(r * r)} + ${side} cm²` }
    }
    if (kind === 'similar') return similarResult(scale)
    return null
  }
  const poly = polyhedronOf(scene)
  if (!poly || !netCheck(scene)?.closed) return null
  const plan = planOf(scene)
  if (plan && kind === 'surface-area') return plan.areaResult
  if (plan && kind === 'volume') return plan.volume?.result ?? null
  if (kind === 'surface-area') {
    // 같은 모양 묶음마다 장수 × 넓이 (직육면체: 2 × 12 + 2 × 8 + 2 × 6, 정육면체: 6 × 9). √ 가 필요한 넓이는 계산하지 않고 식만 쓴다 (값 없음)
    const groups = surfaceGroups(poly)
    const area = (g: number[]) => faceArea(poly, g[0])
    // 각기둥: 밑넓이 × 2 + 옆넓이 (일반 공식과 같은 모양). 삼각기둥은 밑면 높이를 피타고라스로 구했으니 √ 로 답을 쓴다
    if (scene.shape === 'prism') {
      const { sides: n, edge: a, height: h } = scene.size
      const [base, around] = [polygonArea(scene.size), n * a * h]
      if (n === 3) return { formula: `${surd(a * a, 4, 3)} × 2 + 옆넓이 ${num(around)}`, value: `${num(around)} + ${surd(a * a, 2, 3)} cm²` }
      if (!isExact(base)) return { formula: `밑넓이 × 2 + 옆넓이 ${num(around)}` }
      return { formula: `밑넓이 ${num(base)} × 2 + 옆넓이 ${num(around)}`, value: `${approx(2 * base + around)} cm²` }
    }
    // 각뿔: 밑넓이 + 옆넓이
    if (scene.shape === 'pyramid' && groups.length === 2 && groups.every((g) => isExact(area(g)))) {
      const [base, side] = poly.faces[groups[0][0]].vertices.length === 3 ? [groups[1], groups[0]] : groups
      return { formula: `밑넓이 ${num(area(base))} + 옆넓이 ${side.length} × ${num(area(side))}`, value: `${approx(area(base) + side.length * area(side))} cm²` }
    }
    if (!groups.every((g) => isExact(area(g)))) {
      return { formula: groups.map((g) => (isExact(area(g)) ? `${g.length} × ${num(area(g))}` : `${polygonWord(poly.faces[g[0]].vertices.length)} 넓이 × ${g.length}`)).join(' + ') }
    }
    const sum = groups.reduce((total, g) => total + g.length * area(g), 0)
    return { formula: groups.map((g) => `${g.length} × ${num(area(g))}`).join(' + '), value: `${approx(sum)} cm²` }
  }
  if (kind === 'counts') return isRegular(scene) ? { formula: '', table: countsOf(poly).map(([name, n]) => [name, String(n)]) } : null
  if (kind === 'similar') return similarResult(scale)
  if (kind === 'edge-relations') {
    // 직육면체·정육면체는 어느 모서리를 기준으로 해도 개수가 같다 (평행 3, 수직으로 만남 4, 꼬인 위치 4)
    const { parallel, meet, skew, perpendicular } = edgeRelations(poly, defaultEdge(poly))
    const meetWord = perpendicular.length === meet.length ? '수직으로 만남' : '만남'
    return { formula: `평행 ${parallel.length} + ${meetWord} ${meet.length} + 꼬인 위치 ${skew.length}`, value: `나머지 모서리 ${parallel.length + meet.length + skew.length}개` }
  }
  const box = boxSizeOf(scene)
  if (kind === 'volume' && !box) return solidVolumeSummary(scene)
  if (!box) return null
  const { width: w, depth: d, height: h } = box
  if (kind === 'volume') return { formula: `${num(w)} × ${num(d)} × ${num(h)}`, value: `${num(w * d * h)} cm³` }
  if (kind === 'diagonal') {
    const space = diagonalLayout(box).space
    return { formula: `√(${num(w)}² + ${num(d)}² + ${num(h)}²) = ${root(w * w + d * d + h * h)}`, value: `약 ${num(space)} cm` }
  }
  if (kind === 'shortest-path') {
    // 후보마다 √(변² + 변²)를 긴 길부터 > 로 잇고, 마지막(가장 짧은 길)의 값을 강조한다. 길이가 같으면 =
    // UI 는 "formula = value" 로 보여준다: √((4 + 2)² + 3²) = √45 > √((3 + 2)² + 4²) = √41
    const routes = shortestRoutes(poly)
    if (!routes.length) return null
    const expr = (r: (typeof routes)[number]) => `√(${leg(r.legLengths[0])} + ${leg(r.legLengths[1])})`
    const formula = routes
      .map((r, k) => (k === routes.length - 1 ? expr(r) : `${expr(r)} = ${root(r.length ** 2)} ${r.length - routes[k + 1].length > 1e-9 ? '>' : '='} `))
      .join('')
    return { formula, value: root(routes[routes.length - 1].length ** 2) }
  }
  return null
}

// 정다각형 넓이
function polygonArea(s: { sides: number; edge: number }) {
  return (s.sides * s.edge ** 2) / (4 * Math.tan(Math.PI / s.sides))
}

// 상자가 아닌 도형의 부피 식 (solidVolume.ts 와 같은 방식). 밑넓이가 딱 떨어지지 않으면(√) 숫자로 계산하지 않는다
function solidVolumeSummary(scene: ShapeScene): LessonResult | null {
  if (scene.shape !== 'prism' && scene.shape !== 'pyramid') return null
  const A = polygonArea(scene.size)
  const third = scene.shape === 'pyramid' ? ' ÷ 3' : ''
  const h = num(scene.size.height)
  // 삼각기둥: 윗면에서 피타고라스로 구한 밑넓이로 답까지
  if (scene.shape === 'prism' && scene.size.sides === 3) return { formula: `밑넓이 ${surd(scene.size.edge ** 2, 4, 3)} × 높이 ${h}`, value: `${surd(scene.size.edge ** 2 * scene.size.height, 4, 3)} cm³` }
  if (!isExact(A)) return { formula: `밑넓이 × 높이 ${h}${third}` }
  return { formula: `밑넓이 ${num(A)} × 높이 ${h}${third}`, value: `${num((A * scene.size.height) / (third ? 3 : 1))} cm³` }
}
