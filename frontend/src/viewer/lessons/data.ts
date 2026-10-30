// 설명 모드(공식 시각화)의 데이터 쪽: 종류, 자세, 단계 수, 멈춘 뒤 보여줄 공식. 화면 물체는 만들지 않는다 (docs/specs/viewer.md "설명 모드").
// 새 설명(닮음 TODO-29)은 LessonKind 와 아래 표들에 한 줄씩 더한다
import type { ShapeScene } from '../../shared/types.ts'
import { polyhedronOf } from '../polyhedra.ts'
import { defaultEdge, edgeRelations } from './edgeRelationsLayout.ts'
import { diagonalLayout, shortestRoutes } from './pythagorasLayout.ts'
import { faceArea, oppositeFacePairs } from './surfaceLayout.ts'
import { volumeLayout } from './volumeLayout.ts'

export type LessonKind = 'volume' | 'surface-area' | 'diagonal' | 'shortest-path' | 'edge-relations'

export interface Lesson {
  kind: LessonKind
  progress: number // 0 = 시작 전, 1 = 다 보여줌. 단계·속도·멈춤은 UI 가 이 값을 바꿔서 만든다 (접기의 unfold 와 같은 방식)
}

export const LESSON_LABEL: Record<LessonKind, string> = { volume: '부피', 'surface-area': '겉넓이', diagonal: '대각선', 'shortest-path': '최단 거리', 'edge-relations': '위치 관계' }

// 어느 자세에서 보여주는지: 'solid' 는 바로 세운 입체(unfold 0), 'net' 은 바닥에 펼친 전개도(unfold 1)
export const LESSON_POSE: Record<LessonKind, 'solid' | 'net'> = { volume: 'solid', 'surface-area': 'net', diagonal: 'solid', 'shortest-path': 'net', 'edge-relations': 'solid' }

// 시작 전 3D 뷰 아래 안내 한 줄 (ui.md 안내 문구). 피타고라스는 보기 전에 먼저 어림해 보게 묻는다 (리포트 T30 참고 자료)
export const LESSON_HINT: Record<LessonKind, string> = {
  volume: '한 층씩 쌓아 볼까요',
  'surface-area': '마주 보는 면을 한 쌍씩 칠해 볼까요',
  diagonal: '밑면 대각선과 입체 대각선, 어느 쪽이 더 길까요?',
  'shortest-path': '꼭짓점에서 반대쪽 꼭짓점까지, 어느 길이 더 짧을까요?',
  'edge-relations': '빨간 모서리와 다른 모서리는 어떤 사이일까요? 다른 모서리를 눌러 바꿀 수 있어요',
}

// 멈춰 있을 때 3D 뷰 아래 안내. 시작 전에는 LESSON_HINT, 위치 관계는 꼬인 위치를 보기 직전(만남까지 보고 멈춤)에
// "만나지 않으면 평행일까?"를 물어 평면에서 배운 정의와 부딪히게 한다 (리포트 T28 참고 자료). 그 밖에는 없음
export function lessonHint(lesson: Lesson): string | null {
  if (lesson.progress <= 0) return LESSON_HINT[lesson.kind]
  if (lesson.kind === 'edge-relations' && Math.abs(lesson.progress - 2 / 3) < 1e-6) return '남은 모서리는 빨간 모서리와 만나지 않아요. 그럼 평행일까요?'
  return null
}

// 설명을 보여줄 수 있는 도형의 가로·세로·높이. 지금은 직육면체·정육면체만
export function boxSizeOf(scene: ShapeScene) {
  if (scene.shape === 'cuboid') return scene.size
  if (scene.shape === 'cube') return { width: scene.size.edge, depth: scene.size.edge, height: scene.size.edge }
  return null
}

// 단계 수. 설명할 수 없는 도형이면 0
export function lessonStepCount(scene: ShapeScene, kind: LessonKind) {
  const box = boxSizeOf(scene)
  if (!box) return 0
  if (kind === 'volume') return volumeLayout(box.width, box.depth, box.height).layers
  if (kind === 'surface-area') return oppositeFacePairs(polyhedronOf(scene)!).length
  if (kind === 'diagonal') return 3 // 밑면 삼각형, 세운 삼각형, 입체 대각선
  if (kind === 'shortest-path') return shortestRoutes(polyhedronOf(scene)!).length * 2 // 길마다 선, 직각삼각형
  if (kind === 'edge-relations') return 3 // 평행, 만남, 꼬인 위치
  return 0
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))
const near = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : n)
// √x: 제곱수면 정수, 정수면 √29, 소수면 어림값
const root = (x: number) => {
  const s = near(Math.sqrt(x))
  if (Number.isInteger(s)) return String(s)
  return Number.isInteger(near(x)) ? `√${near(x)}` : num(s)
}
const leg = (parts: number[]) => (parts.length > 1 ? `(${parts.map(num).join(' + ')})²` : `${num(parts[0])}²`)

// 애니메이션이 멈춘 뒤 보여줄 식과 값 (ui.md 친절한 설명 원칙: 글은 멈춘 뒤에)
export function lessonSummary(scene: ShapeScene, kind: LessonKind): { formula: string; value: string } | null {
  const box = boxSizeOf(scene)
  if (!box) return null
  const { width: w, depth: d, height: h } = box
  if (kind === 'volume') return { formula: `가로 × 세로 × 높이 = ${num(w)} × ${num(d)} × ${num(h)}`, value: num(w * d * h) }
  if (kind === 'surface-area') {
    // 쌍마다 면 하나의 넓이. 직육면체는 앞·뒤 = 가로×높이, 왼·오 = 세로×높이, 위·아래 = 가로×세로
    const poly = polyhedronOf(scene)!
    const areas = oppositeFacePairs(poly).map(([f]) => faceArea(poly, f))
    const sum = areas.reduce((s, a) => s + a, 0)
    return { formula: `2 × (${areas.map(num).join(' + ')}) = 2 × ${num(sum)}`, value: num(2 * sum) }
  }
  if (kind === 'diagonal') {
    const space = diagonalLayout(box).space
    return { formula: `√(${num(w)}² + ${num(d)}² + ${num(h)}²) = ${root(w * w + d * d + h * h)}`, value: `약 ${num(space)}` }
  }
  if (kind === 'edge-relations') {
    // 직육면체·정육면체는 어느 모서리를 기준으로 해도 개수가 같다 (평행 3, 수직으로 만남 4, 꼬인 위치 4)
    const { parallel, meet, skew, perpendicular } = edgeRelations(polyhedronOf(scene)!, defaultEdge(polyhedronOf(scene)!))
    const meetWord = perpendicular.length === meet.length ? '수직으로 만남' : '만남'
    return { formula: `평행 ${parallel.length} + ${meetWord} ${meet.length} + 꼬인 위치 ${skew.length}`, value: `나머지 모서리 ${parallel.length + meet.length + skew.length}개` }
  }
  if (kind === 'shortest-path') {
    // 후보마다 √(변² + 변²)를 긴 길부터 > 로 잇고, 마지막(가장 짧은 길)의 값을 강조한다. 길이가 같으면 =
    // UI 는 "formula = value" 로 보여준다: √((4 + 2)² + 3²) = √45 > √((3 + 2)² + 4²) = √41
    const routes = shortestRoutes(polyhedronOf(scene)!)
    if (!routes.length) return null
    const expr = (r: (typeof routes)[number]) => `√(${leg(r.legLengths[0])} + ${leg(r.legLengths[1])})`
    const formula = routes
      .map((r, k) => (k === routes.length - 1 ? expr(r) : `${expr(r)} = ${root(r.length ** 2)} ${r.length - routes[k + 1].length > 1e-9 ? '>' : '='} `))
      .join('')
    return { formula, value: root(routes[routes.length - 1].length ** 2) }
  }
  return null
}
