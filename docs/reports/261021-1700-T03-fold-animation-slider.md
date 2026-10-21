# 작업 기록 - 접기 애니메이션 + 슬라이더

- 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 접기 슬라이더(0% = 전개도, 100% = 입체)와 "◀ 펼치기 / 접기 ▶" 버튼으로 직육면체가 연속으로 접히고 펴진다
- 펼침 값 `s`를 `ViewerProps.unfold`로 밖에서 넣는다. 챗봇 화면 조작(TODO-10)도 이 값을 쓴다
- 3D 뷰 왼쪽 위 상태 배지("직육면체 · 접는 중 43%", "✔ 빈틈없이 직육면체가 됐어요")

## 변경 범위
- 스펙: `viewer.md`에 `ViewerProps`(`scene`, `unfold`)와 카메라 규칙, `ui.md`에 접기 % 방향과 버튼 동작
- 뷰어: `unfold`만 바뀌면 다시 만들지 않고 `applyUnfold`로 회전만 바꾼다. 임시 `?s=` 주소 파라미터 삭제
- UI: `FoldControls.tsx`(슬라이더, rAF 애니메이션), `foldStatus.ts`(접기 %·배지 문구·조사), `App.tsx` 연결

## 주요 변경 파일
- `frontend/src/viewer/index.ts`, `frontend/src/viewer/ThreeViewer.tsx`
- `frontend/src/ui/App.tsx`, `frontend/src/ui/FoldControls.tsx`, `frontend/src/ui/foldStatus.ts`, `frontend/src/ui/foldStatus.test.ts`
- `frontend/src/index.css`, `frontend/package.json`(`npm test`에 foldStatus 검사 추가)
- `docs/specs/viewer.md`, `docs/specs/ui.md`

## 결정
- 슬라이더는 시안대로 "접기 %"라서 뷰어의 `s`와 방향이 반대다: 접기 % = (1 − s) × 100. 변환은 `foldStatus.ts` 한 곳에서만 한다
- 애니메이션은 UI가 `unfold` 값을 바꿔서 만든다. 뷰어는 값만 받는다 (뷰어 교체 시에도 그대로)
- 카메라는 다 접은 모양과 다 펼친 모양을 모두 담는 범위를 보게 한 번만 잡는다. 접는 동안 카메라가 움직이지 않는다
- 시작은 펼친 전개도(접기 0%)에서 한다. "접기 ▶"를 눌러 보게 하려고

## 추가 (2026-10-21, 화면 확인 후 같은 PR)
- 구도: 전개도가 세워진 평면에서 화면 안쪽으로 접혀 보여서, 전개도를 **바닥에 눕히고** 접으면 면이 위로 일어서게 바꿨다. 면 트리·`applyUnfold`는 그대로이고 `layOnFloor(tree, poly)`가 트리 전체를 돌린다(루트 면 바깥 법선 → −y, 루트 면이 y = 0). 루트 면 법선으로 계산해서 정다면체(TODO-16)에도 그대로 쓴다
- 카메라: 비스듬히 위에서 내려다보는 구도(수평에서 약 40°). 바닥 아래로는 못 돌린다
- 색: 면 바깥 흰색, 안쪽 아주 연한 하늘색(#E3F1FB). 같은 삼각형을 재질 두 개(FrontSide/BackSide)로 그려서 메시는 면마다 하나다
- 조명·바닥: HemisphereLight + 그림자 지는 DirectionalLight, 옅은 격자(`GridHelper`)와 그림자만 받는 판(`ShadowMaterial`). 이 three.js 버전은 `PCFSoftShadowMap`이 없어져서 기본 PCF에 `shadow.radius`로 가장자리를 흐렸다
- 검사: `faceTree.test.ts`에 바닥에 눕힌 뒤 `s = 1`이면 모든 면이 y = 0에 바깥이 아래, `s = 0`이면 상자가 바닥 위에 서는지 추가
- 스펙: `viewer.md`(바닥에 눕히기, 카메라, 바닥·조명), `ui.md`(색 기준, 면 색)
- 새 TODO-23(#38) "보이지 않는 모서리 점선 표시 + 보기 옵션 토글" 등록 (이 PR에서는 구현하지 않음)

## 리스크/이슈
- 펼친 전개도는 바닥 판보다 아주 조금 위에 있다. 크게 확대하면 바닥 격자와 겹쳐 깜빡일 수 있다
- 이 브랜치는 TODO-2 PR(#36)이 머지되기 전에 그 브랜치 위에서 만들었다. #36이 먼저 머지돼야 한다
- 창 크기가 바뀌면 카메라 거리를 다시 잡아서, 사용자가 바꾼 확대 정도는 초기화된다

## 다음 작업
- TODO-4(선), TODO-5(꼭짓점 하이라이트), TODO-22(맞닿는 모서리 색), TODO-23(가려진 모서리 점선, 보기 옵션), TODO-12(도형·치수 입력)

## 참고
- 관련 문서: `docs/specs/viewer.md`, `docs/specs/ui.md`
