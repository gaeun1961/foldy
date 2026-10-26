# 작업 기록 - 같은 꼭짓점 복사본 표시·하이라이트

- 일시: 2026-10-26 17:36 (KST)
- 작성자: HandoA01
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 면마다 자기 꼭짓점의 표시점(작은 구)과 라벨(`vertexLabels`, ㄱ·ㄴ…)을 붙였다. 펼치면 한 꼭짓점이 최대 3곳에 같은 라벨로 보이고, 다 접으면 한 자리에 겹친다
- 꼭짓점을 누르거나 `highlightVertices`가 들어오면 그 꼭짓점의 복사본이 모두 같은 색으로 커지고, 나머지 꼭짓점은 흐려진다
- 보기 옵션 "꼭짓점 라벨"(기본 켬)

## 변경 범위
- 스펙: `viewer.md`에 `ViewerProps.showVertexLabels`·`highlightVertices`, "꼭짓점 복사본"의 그리기·색 규칙. `ui.md` 색 기준에 꼭짓점 줄
- 뷰어: `ThreeViewer.tsx`에서 표시점·라벨 Sprite를 면 메시의 자식으로 붙인다. `pullTowardCamera`는 Sprite 셰이더도 당길 수 있게 했다
- UI: `ViewOptions.tsx` 체크박스, `App.tsx` 기본값

## 주요 변경 파일
- `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/viewer/index.ts`
- `frontend/src/ui/ViewOptions.tsx`, `frontend/src/ui/App.tsx`
- `docs/specs/viewer.md`, `docs/specs/ui.md`

## 결정
- **색은 고를 때만** (사용자 결정): TODO는 꼭짓점마다 색을 정하라고 했지만, ui.md는 진한 색을 맞닿는 모서리에만 쓰게 한다. 둘 다 기본으로 켜면 모서리 7색과 꼭짓점 8색이 섞여서, 평소에는 진한 회색으로 두고 누르거나 강조할 때만 7색을 강조 목록 순서대로 쓴다. 같은 꼭짓점은 누르면 복사본이 함께 칠해지는 것으로 찾는다
- 라벨·표시점을 꼭짓점 위치에 두었다. 면 안쪽으로 옮기면 다 접었을 때 복사본 3개가 따로 보인다. 같은 위치면 하나로 겹친다
- 라벨은 카메라를 향하는 Sprite라서 그대로 두면 자기 면에 반쯤 잘린다. 모서리 선과 같은 방법(`pullTowardCamera`)으로 라벨 크기만큼 카메라 쪽으로 당겼다. Sprite 셰이더에는 `project_vertex`가 없어서 `mvPosition.xy += rotatedPosition;` 뒤에 끼운다. 앞의 면에 가려진 꼭짓점 라벨은 그대로 가려진다
- 라벨은 CSS2DRenderer 대신 Sprite + 캔버스 텍스처로 했다. CSS2D는 가려지지 않아서 접은 상자의 뒤쪽 꼭짓점 라벨이 다 보인다
- 색은 꼭짓점 인덱스마다 재질 하나를 두고 복사본이 같이 쓴다. 색을 바꾸면 복사본 모두에 적용된다
- 클릭은 TODO-22의 방식을 재사용했다: 보이지 않는 큰 hit 구, 면도 같이 맞혀서 가려진 꼭짓점 제외, 5px 넘게 끌면 무시. 꼭짓점과 모서리 쌍은 하나만 고른다
- `highlightVertices`가 비어 있지 않으면 누른 꼭짓점보다 먼저다 (챗봇 TODO-10이 쓴다)

## 추가 (2026-10-26, 화면 확인 후 같은 PR)
- 한글 기호(ㄱ, ㄴ…) 라벨이 3D 화면에서 보기 좋지 않아서, 한글이 들어 있는 기호와 기호 없음(`null`)은 라벨을 그리지 않게 했다 (사용자 결정). 문제집은 한글 기호가 많으므로 대부분 라벨 없이 회색 표시점만 보인다. 영문 기호(A, B…)는 그대로 보인다. 표시점·누르기·강조는 그대로다

## 리스크/이슈
- 헤드리스 크롬(SwiftShader)으로 전개도(라벨 복사본)와 접는 중(`highlightVertices=[0, 6]`)을 찍어 확인했다. 실제 마우스 클릭은 `npm run dev`에서 손으로 확인해야 한다
- 펼친 전개도에서 라벨이 꼭짓점 오른쪽 위에 붙어서 이웃 면 위에 놓일 때가 있다

## 다음 작업
- TODO-6(선 긋기)은 이 표시점과 hit 구를 그대로 쓰고, 모서리 중점 표시점만 더한다
- TODO-10은 `highlightVertices`로 꼭짓점을 강조한다

## 참고
- 관련 문서: `docs/specs/viewer.md` "꼭짓점 복사본", `docs/specs/ui.md` 색 기준
