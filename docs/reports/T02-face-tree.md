# 작업 기록 - 면 트리 기반 다면체 렌더링 (직육면체부터)

- 일시: 2026-10-21 13:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가
- 관련 이슈: #8 (TODO-2)

## 요약
- 직육면체·정육면체를 하나의 상자 대신 **면 트리 데이터**(면 6개, 부모 면, 붙는 모서리, 이면각)로 그린다
- 면마다 붙는 모서리에 pivot `Group`을 두는 계층을 만들었다. `applyUnfold(tree, s)`로 각 pivot을 `s × (180° − 이면각)` 돌리면 펼쳐진다
- `npm test`로 `s = 0`이면 원래 입체, `s = 1`이면 viewer.md의 cross 배치가 되는 것을 검사한다

## 변경 범위
- `frontend/src/viewer/polyhedra.ts` (새 파일)
  - 다면체 데이터를 둔다 (three.js 없음)
  - `boxPositions`는 크기를 받아 꼭짓점 좌표를 계산한다
  - `BOX_FACES`는 viewer.md의 면 트리 표 그대로다
  - `polyhedronOf(scene)`은 도형별 데이터를 돌려주고, 곡면 도형이면 `null`이다
- `frontend/src/viewer/faceTree.ts` (새 파일)
  - `buildFaceTree`는 면 트리를 three.js 계층으로 만든다. 면 메시는 접힌 상태 좌표 그대로 넣고, 그 앞에 pivot과 위치 보정 그룹을 둔다
  - 그 밖에 `applyUnfold`, `disposeFaceTree`가 있다
  - 각 노드는 자기 꼭짓점 인덱스를 가진다 (TODO-4~6에서 사용)
- `frontend/src/viewer/faceTree.test.ts`와 `npm test`
  - 직육면체(4×2×3)와 정육면체(2.5)를 검사한다
  - `s = 0`: 모든 면 좌표가 원래 좌표와 같다
  - `s = 1`: 모든 면이 앞면 평면 위에 있고, 면마다 cross 칸에 맞게 놓이고, 바깥 면이 앞을 향한다
  - 곡면 도형은 `null`이다
  - 데이터를 일부러 틀리게 바꿔(붙는 모서리, 이면각) 검사가 실패하는 것도 확인했다
- `ThreeViewer.tsx`
  - `BoxGeometry`를 면 트리로 바꿨다
  - 면은 연한 회색(#f4f5f7), 모서리는 진한 회색, 배경은 옅은 베이지다 (ui.md)
  - 카메라는 지금 모양 전체가 들어오게 가운데를 본다
- 문서
  - viewer.md: 구현 위치와 회전 방향 규칙
  - stack.md, AGENTS.md: `npm test`
  - 01: viewer 파일 목록
  - TODO-3 참고: `applyUnfold`는 이미 있음
  - TODO 목록: TODO-3과 TODO-4를 "지금 시작 가능"으로 옮김

## 주요 변경 파일
- `frontend/src/viewer/polyhedra.ts`, `faceTree.ts`, `faceTree.test.ts`, `ThreeViewer.tsx`, `frontend/package.json`
- `docs/specs/viewer.md`, `docs/specs/stack.md`, `docs/01-folder-architecture.md`, `AGENTS.md`, `docs/todo/00-todo-list.md`, `docs/todo/03·04·17-*.md`

## 결정 사항
- **회전 방향을 데이터에 적지 않는다**: 다 펼쳤을 때 면의 바깥 법선이 부모 면의 바깥 법선과 같아지는 쪽으로 자동으로 정한다. 정다면체를 추가할 때(TODO-16) 부호를 일일이 맞추지 않아도 된다
- **`applyUnfold`는 이번에 만들었다**: cross 검사를 하려면 펼치는 계산이 필요해서다. TODO-3은 슬라이더, 애니메이션, `ViewerProps` 연결만 하면 된다
- **임시 `?s=` 주소 파라미터**: 슬라이더가 생기기 전에 펼친 모습을 눈으로 확인하려고 넣었다 (`http://localhost:5173/?s=1`). TODO-3에서 지운다
- **테스트 방식**: 테스트 프레임워크를 넣지 않고, Node 22가 TS 파일을 바로 실행하는 기능을 쓴다. `allowImportingTsExtensions` 설정이 이미 켜져 있었다

## 리스크/이슈
- 면을 부채꼴 삼각형으로 나누므로, 볼록 다각형인 면만 그릴 수 있다. 1~2차 도형은 모두 볼록이다
- 카메라 위치는 처음 그릴 때 한 번만 정한다. TODO-3에서 슬라이더로 펼칠 때 화면 밖으로 나가면 그때 맞춘다

## 다음 작업
- TODO-3 (#9) 접기 슬라이더, TODO-4 (#10) 면 위 선분

## 참고
- 관련 문서: `docs/specs/viewer.md` (다면체: 면 트리), `docs/specs/shape-scene.md` (꼭짓점 인덱스 규칙, cross)
