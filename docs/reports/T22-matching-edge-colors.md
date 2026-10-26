# 작업 기록 - 맞닿는 모서리 같은 색으로 칠하기

- 일시: 2026-10-26 17:22 (KST)
- 작성자: HandoA01
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 접으면 맞닿는 모서리 한 쌍을 같은 색으로 칠한다. 직육면체·정육면체는 7쌍, 7색(빨강·주황·노랑·초록·청록·파랑·보라)
- 색칠한 모서리를 누르면 그 쌍의 두 모서리가 함께 굵어진다 (색만으로 구분하지 않기)
- 보기 옵션 "맞닿는 모서리 색"(기본 켬)과 3D 뷰 아래 안내 문구 "같은 색 모서리끼리 만나요"

## 변경 범위
- 스펙: `viewer.md`에 `ViewerProps.showMatchingEdges`, "맞닿는 모서리"의 계산 위치·그리기·고르기 규칙. `ui.md`에 안내 문구는 애니메이션 중 숨김
- 뷰어: `polyhedra.ts`의 `matchingEdges(poly)`(three.js 없음)가 쌍을 찾고, `ThreeViewer.tsx`가 쌍마다 색 원기둥을 두 면 메시에 붙인다. 클릭은 `Raycaster`
- UI: `ViewOptions.tsx` 체크박스, `App.tsx` 기본값·안내 문구, `index.css`
- 검사: `faceTree.test.ts`에 7쌍, 쌍마다 다른 면의 같은 모서리, 붙는 모서리 5개와 합쳐 12개

## 주요 변경 파일
- `frontend/src/viewer/polyhedra.ts`, `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/viewer/index.ts`, `frontend/src/viewer/faceTree.test.ts`
- `frontend/src/ui/ViewOptions.tsx`, `frontend/src/ui/App.tsx`, `frontend/src/index.css`
- `docs/specs/viewer.md`, `docs/specs/ui.md`

## 결정
- 쌍 찾기: 면마다 모서리를 돌면서 hinge가 아닌 모서리를 꼭짓점 두 개(정렬)로 묶는다. 도형 이름으로 분기하지 않아서 정다면체(TODO-16)도 데이터만 넣으면 된다
- 색 모서리는 1px 선 대신 가는 원기둥(반지름 0.8%)으로 그렸다. WebGL 선은 굵기가 1px로 고정이라 색이 잘 안 보이고 "굵게"도 할 수 없다
- 그리기 순서: 기본 실선은 깊이를 쓰지 않고 카메라 쪽으로 당겨 그려서(TODO-23) 원기둥 위에 덧그려진다. 원기둥을 `renderOrder = 2`로 실선·점선 뒤에 그려 덮었다. 면 뒤로 가려진 색 모서리는 원기둥이 안 보이고 회색 점선만 남는다
- 클릭: 원기둥이 가늘어서 보이지 않는 굵은 원기둥(반지름 4%)을 자식으로 두고 맞힌다. 면도 같이 맞혀서, 면에 가려진 뒤쪽 모서리는 고르지 않는다. 5px 넘게 끌면 화면 돌리기로 보고 무시한다
- 고른 쌍은 뷰어 안 상태로 두고 `ViewerProps`에 넣지 않았다 (지금 쓰는 곳이 없다)
- 안내 문구는 애니메이션 중에는 숨긴다 (ui.md 친절한 설명 원칙)

## 리스크/이슈
- 헤드리스 크롬(SwiftShader)으로 전개도·접는 중(고른 쌍 굵게)을 찍어 확인했다. 실제 마우스 클릭은 `npm run dev`에서 손으로 확인해야 한다
- 단계별 접기에서 나머지 면을 연하게 할 때도 모서리 색은 진하게 남는다
- `npm test`는 Node 22 이상이 필요하다 (`engines`). Node 20에서는 `.ts`를 못 읽는다

## 다음 작업
- TODO-28(모서리 위치 관계)은 이 색과 동시에 켜지지 않게 하고, 모서리 클릭(보이지 않는 hit 원기둥)을 재사용할 수 있다
- 정다면체(TODO-16)는 쌍이 7개보다 많아 색을 돌려 쓴다. 이웃한 쌍이 같은 색이 되면 색 배정을 다시 본다

## 참고
- 관련 문서: `docs/specs/viewer.md` "맞닿는 모서리", `docs/specs/ui.md` "바꿀 것"
