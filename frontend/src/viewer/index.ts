import type { Line, PolyhedronPoint, ShapeScene } from '../shared/types'
import type { BookResult } from './bookScene'
import type { Lesson } from './lessons/data'

// 뷰어 구현이 지켜야 할 props (docs/specs/viewer.md). UI는 이 인터페이스와 아래 Viewer, foldStepCount 만 사용한다.
// GeoGebra 등으로 바꿀 때는 같은 props 를 받는 컴포넌트를 만들고 아래 export 한 줄만 교체.
export interface ViewerProps {
  scene: ShapeScene
  unfold?: number // 펼침 값 s: 0 = 입체, 1 = 전개도 (기본 0)
  foldMode?: 'all' | 'step' // 한 번에 접기 / 면을 하나씩 접기 (기본 'all')
  showHiddenEdges?: boolean // 가려진 모서리를 점선으로 (기본 true, 보기 옵션)
  showMatchingEdges?: boolean // 접으면 맞닿는 모서리 쌍을 같은 색으로 (기본 true, 보기 옵션)
  showVertexLabels?: boolean // 꼭짓점 라벨 (기본 true, 보기 옵션)
  highlightVertices?: number[] // 강조할 꼭짓점 인덱스. 복사본 모두 색으로, 나머지는 흐리게 (챗봇 화면 조작 TODO-10)
  lesson?: Lesson | null // 설명 모드 (부피 등 공식 시각화). 입체 상태(unfold 0)에서 보여준다. 없으면 보통 보기
  drawLines?: boolean // 선 긋기 모드: 클릭으로 선분의 두 끝점을 고른다 (기본 false)
  edgeDivisions?: 2 | 3 | 4 // 선 긋기에서 모서리 등분 (기본 2 = 중점)
  onSceneChange?: (scene: ShapeScene) => void // 선분이 더해진 새 scene. UI가 다시 scene 으로 넘긴다
  onDrawState?: (state: DrawState) => void // 선 긋기 진행 상태 (안내 문구용)
  pageText?: string[] // 책 장면 왼쪽 페이지 글. 첫 줄 제목, 나머지 본문 (UI가 정한다, viewer.md "책 장면")
  pageResult?: BookResult // 공식 결과. 왼쪽 쪽에서 한 줄 설명 자리에 찍는다 (viewer.md "책 장면")
  pageMenu?: PageMenuItem[] // 왼쪽 쪽 메뉴 (공식, 다른 전개도 보기). 고르는 일은 UI 가 한다 (viewer.md "책 장면")
  onPageMenu?: (id: string) => void // 왼쪽 쪽 메뉴의 줄을 눌렀을 때
  pageNumbers?: [number, number] // 책 아래 귀퉁이 왼쪽·오른쪽 쪽 번호 (없으면 찍지 않음, UI가 차례에 맞춰 정한다)
  onRouteChoices?: (routes: Line<PolyhedronPoint>[][]) => void // 방금 그은 선의 길 후보 (첫째가 그은 길). 같은 면 두 점이면 그 면 위 직선 + 다른 면들을 지나는 길
  photo?: NetPhoto // 따라 그린 학습지 사진. 전개도 grid 일 때만 책 페이지에 깐다 (viewer.md "책 장면")
  onFacePick?: (pick: FacePick | null) => void // 마주 보는 면 보기: 누른 면과 마주 보는 면 (풀리면 null, viewer.md)
  faceMarking?: boolean // 면 표시 모드: 면을 누르면 마주 보는 면 보기 대신 onFaceMark (기본 false)
  onFaceMark?: (netFace: number) => void // 면 표시 모드에서 누른 면의 scene.net.faces 인덱스 (학습지 전개도 grid 만)
  fromContents?: boolean // 빈 책 차례에서 골라 넘어왔다: 처음 열 때 빈 책 구도에서 이 화면 구도로 다가간다 (viewer.md "빈 책", 처음 만들 때만 읽음)
}

// 누른 면과 다 접었을 때 마주 보는 면. text 는 학습지 전개도 면에 쓰인 글자 (없으면 null)
export type FacePick = { face: number; text: string | null; opposite: { face: number; text: string | null }[] }

// 전개도 그리기 칸에서 맞춘 사진 위치 (단위: 칸). x, y 가운데, size 사진이 비율대로 들어가는 정사각형 한 변, angle 시계 방향 각도(도)
export type NetPhoto = { src: string; x: number; y: number; size: number; angle: number }

// idle: 첫 점을 기다림 / picked: 첫 점을 고름 / no-path: 겉면으로 이을 길을 찾지 못해 긋지 않음 (드묾)
export type PageMenuItem = { id: string; label: string; active: boolean; enabled: boolean }
export type DrawState = 'idle' | 'picked' | 'no-path'

export { Viewer } from './Viewer'
export { EmptyBook } from './EmptyBook' // 도형이 없을 때 빈 책 + 차례 (viewer.md "빈 책")
export type { BookContent } from './bookScene'
export { setMatColor } from './bookScene' // 매트 밝기 비교용 임시 (ui.md 컨셉)
export { foldStepCount, netCheck } from './polyhedra'
export { NET_VARIANTS, netVariant } from './gridNet' // 정육면체 전개도 11가지 → 치수에 맞춘 grid 면 (viewer.md "전개도 grid")
export { CONE_THIRD_LINK, LESSON_HINT, LESSON_LABEL, LESSON_POSE, lessonGrade, lessonHint, lessonNote, lessonStepCount, lessonSummary, lessonTabs, type Lesson, type LessonKind, type PiMode } from './lessons/data'
export { SIMILAR_SCALES } from './lessons/similarLayout'
export { RELATION_COLORS } from './lessons/edgeRelationsLayout'
export { STAIR_LAYERS } from './lessons/volumeLayout'
export { HologramViewer, type HologramProps } from './HologramViewer'
export { stageSupported as hologramSupported } from './stage' // 아크릴 피라미드 홀로그램 (viewer.md "홀로그램"). 무대가 그리는 도형이면 홀로그램도 된다
