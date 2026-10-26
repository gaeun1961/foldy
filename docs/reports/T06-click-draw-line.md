# 작업 기록 - 꼭짓점·모서리 등분점 클릭으로 선 긋기

- 일시: 2026-10-26 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- "✏️ 선 긋기"를 켜고 꼭짓점이나 모서리 등분점을 두 번 누르면 그 면 위에 선분이 더해진다. 접고 펴면 TODO-4의 선분처럼 면을 따라간다
- 학습지에는 중점만이 아니라 "3등분한 점"도 나와서, 모서리 나누기 2·3·4등분(기본 2 = 중점)을 고르면 그 등분점만 파란 점으로 보인다
- 첫 점은 분홍 큰 점으로 보이고, 3D 뷰 아래 안내가 단계마다 바뀐다: "점 두 개를 눌러 선을 그어 보세요" → "같은 면 위의 점을 하나 더 눌러 보세요" → (다른 면이면) "두 점이 같은 면 위에 있어야 해요"
- "선 지우기"는 마지막 선부터 하나씩 지운다

## 변경 범위
- 스펙: `viewer.md`에 ViewerProps(`drawLines`, `edgeDivisions`, `onSceneChange`, `onDrawState`), `lines`만 바뀌면 선분만 다시 그리기, "선 긋기" 절. `ui.md`에 선 긋기 안내 문구·선 지우기·색
- 뷰어: `faceTree.ts`의 `facePoints(poly, face, n)`(면 위 고를 수 있는 점), `ThreeViewer.tsx`(등분점 표시점, 점 고르기, 선분만 다시 그리기), `index.ts`(props, `DrawState`)
- UI: `LineControls.tsx`(선 긋기 토글·나누기·선 지우기), `App.tsx`(scene 상태, 안내 문구), `index.css`
- 검사: `faceTree.test.ts`에 3등분 점 수·1/3 지점 좌표·2등분은 중점 하나·등분점 선분이 그 면에 놓이는지

## 주요 변경 파일
- `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/viewer/faceTree.ts`, `frontend/src/viewer/faceTree.test.ts`, `frontend/src/viewer/index.ts`
- `frontend/src/ui/App.tsx`, `frontend/src/ui/LineControls.tsx`, `frontend/src/index.css`
- `docs/specs/viewer.md`, `docs/specs/ui.md`

## 결정
- 중점 대신 등분점: 학습지의 "3등분한 점"을 그대로 고를 수 있게. 표시점을 다 띄우면 헷갈려서 고른 등분만 보인다. ShapeScene은 그대로(`t`는 원래 아무 비율 가능)
- 점 고르기는 표시점마다 클릭 영역을 두지 않고 **누른 면 → 그 면에서 가장 가까운 점**(도형 크기의 6% 안). 짧은 모서리를 4등분하면 영역이 겹치고, 다 접으면 꼭짓점 복사본이 한 자리에 겹쳐서다. 면 가운데처럼 점에서 먼 곳은 무시, 도형 밖을 누르면 고른 점이 풀린다
- 같은 면 판단은 누른 면이 아니라 `placeLines` 규칙(두 점을 모두 가진 면이 있는가). 다 접으면 복사본이 겹쳐 누른 면만으로는 알 수 없다
- `scene`이 바뀌면 뷰어를 다시 만들던 것을, `lines`만 바뀌면 선분만 다시 그리게 했다. 안 그러면 선을 그을 때마다 돌려 놓은 화면이 처음 구도로 돌아간다
- 선 긋기 중에는 꼭짓점 강조(TODO-5)·모서리 쌍 고르기(TODO-22)를 하지 않는다

## 확인
- 헤드리스 크롬(임시 lab 페이지, 지움)으로 선 긋기 모드 3등분에서 등분점이 모서리마다 두 개씩 보이고, 1/3 점에서 시작한 선분이 제자리에 그려지는 것을 봤다. 클릭으로 긋는 동작은 화면에서 직접 확인한다

## 리스크/이슈
- 곡면 도형은 아직 선 긋기를 지원하지 않는다 (TODO-20)
- 선 지우기는 사진 인식으로 들어온 선도 마지막 것부터 지운다

## 다음 작업
- TODO-30(피타고라스 최단 거리)은 이 선 긋기와 면 위 선분을 쓴다

## 참고
- 관련 문서: `docs/specs/viewer.md` "선 긋기", `docs/specs/ui.md` 화면 배치 5번·안내 문구
