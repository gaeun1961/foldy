# 작업 기록 - 보이지 않는 모서리 점선 표시 + 보기 옵션 토글

- 일시: 2026-10-26 16:56 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 면에 가려 안 보이는 모서리(또는 그 부분)를 교과서 겨냥도처럼 회색 점선으로 그린다. 보이는 부분은 지금처럼 실선이다
- 접기 패널 아래 "보기" 줄에 체크박스 "보이지 않는 모서리 점선"(기본 켬)을 두었다

## 변경 범위
- 스펙: `viewer.md`에 `ViewerProps.showHiddenEdges`와 "가려진 모서리" 규칙, `ui.md`에 보기 옵션 배치·기본값·점선 색
- 뷰어: `ThreeViewer.tsx`에서 면마다 점선 모서리(`LineSegments` + `LineDashedMaterial`)를 면 메시의 자식으로 한 번 더 그린다. `showHiddenEdges`가 바뀌면 다시 만들지 않고 보이기만 바꾼다
- UI: `ViewOptions.tsx`(체크박스 목록), `App.tsx`(보기 옵션 상태를 `Viewer`에 펼쳐 넘김), `index.css`

## 주요 변경 파일
- `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/viewer/index.ts`
- `frontend/src/ui/ViewOptions.tsx`, `frontend/src/ui/App.tsx`, `frontend/src/index.css`
- `docs/specs/viewer.md`, `docs/specs/ui.md`

## 결정
- 가려졌는지는 계산하지 않고 GPU 깊이로 정한다: 점선은 `depthFunc: GreaterDepth`, `depthWrite: false`, `renderOrder = 1`(면을 다 그린 뒤). 그래서 화면을 돌리거나 접고 펴도 매 프레임 맞다. 면은 이미 `polygonOffset`으로 조금 뒤에 있어서 자기 면의 모서리는 점선이 되지 않는다
- 점선은 `LineLoop` 대신 `LineSegments`로 그렸다. `LineLoop`은 닫는 모서리에서 선 길이 값이 거꾸로 줄어 그 모서리만 점선이 촘촘해진다
- 점선 간격은 도형 크기(카메라 범위 반지름)에 비례한다
- 보기 옵션은 불리언 props 하나씩으로 더한다. 새 옵션은 `ViewerProps`, `ViewOptions.tsx`의 목록, `App.tsx` 기본값에 한 줄씩 추가한다
- 기본값은 켬 (TODO 제안대로)

## 리스크/이슈
- `npm test`는 렌더링을 하지 않아서 점선이 맞게 보이는지는 화면으로만 확인할 수 있다
- 면과 거의 나란한 각도로 볼 때 모서리 끝부분이 점선과 실선 사이에서 조금 깜빡일 수 있다

## 다음 작업
- TODO-22(맞닿는 모서리 색), TODO-5(꼭짓점 라벨)는 같은 "보기" 줄에 체크박스를 더한다

## 참고
- 관련 문서: `docs/specs/viewer.md` "가려진 모서리", `docs/specs/ui.md` 화면 배치 6번
