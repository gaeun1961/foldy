# 작업 기록 - 각기둥·각뿔 면 트리와 전개도

- 일시: 2026-10-30 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가 (계약 변경 + 3D 뷰어 데이터 + UI)

## 요약
- ShapeScene 에 각기둥(`prism`)·각뿔(`pyramid`)을 더했다. 밑면은 정다각형이고 `size = { sides, edge, height }`
- 치수로 만들기에서 "밑면" 드롭다운(삼각형~팔각형)과 밑면 한 변·높이 슬라이더로 만들고, 빈 책 차례 7·8번에서 바로 펼친다
- 화면 이름은 밑면에 따라 "오각기둥", "사각뿔"처럼 부른다 (상태 배지, 왼쪽 쪽 제목)

## 결정
- **계약** (이슈 #47 댓글로 합의): `sides`는 정수 3~12, 꼭짓점 수는 각기둥 2·sides, 각뿔 sides+1. 밑면 0 ~ sides−1 은 0 앞왼쪽, 1 앞오른쪽(앞 모서리 0-1)부터 위에서 볼 때 앞 → 오른쪽 → 뒤 → 왼쪽. 각기둥 윗면은 밑면 바로 위, 각뿔 꼭대기는 sides 번. 사각기둥 + 정사각형 밑면이면 직육면체 꼭짓점 번호와 같다
- 밑면은 정다각형만. 직사각형 밑면 사각기둥은 직육면체로 만든다
- 각기둥 전개도·접는 순서는 직육면체와 같은 규칙: 앞 옆면이 루트, 옆면을 한 줄로(오른쪽 절반, 왼쪽 나머지), 윗면·밑면은 앞 옆면에, 왼쪽 → 오른쪽(먼 것부터) → 윗면 → 밑면
- 각뿔은 밑면이 루트인 별 모양 전개도, 카메라에서 먼 옆면부터 접는다 (정다면체와 같은 규칙)
- 이면각은 데이터에 적지 않고 좌표에서 구한다 (`solid`). 정다면체도 같은 함수를 쓰게 바꿨다
- 2차 TODO를 1차보다 먼저 한 것은 TODO-16과 같은 이유 (사용자 결정, 시연에서 여러 도형)

## 변경 범위
- 계약: `docs/specs/shape-scene.md`, `frontend/src/shared/types.ts`(`PolygonSize`, `PolygonSolidScene`, `vertexCountOf`), `backend/app/ai/schema.py`(`PolygonSize`, `PolygonSolidScene`, `_vertex_count`), `backend/tests/test_schema.py`
- 챗봇 프롬프트 `backend/app/ai/chat.py`: 각기둥·각뿔 이름과 꼭짓점 읽는 법
- 뷰어: `polyhedra.ts`(`prism`, `pyramid`, `solid`), `faceTree.test.ts`(삼각·오각·육각기둥, 삼각·사각·칠각뿔)
- UI: `manualScene.ts`(`SHAPES`, `SIDES`, `crossScene`), `ManualInput.tsx`(밑면 드롭다운), `foldStatus.ts`(`shapeName`, `polygonName`), `App.tsx`(차례, 왼쪽 쪽 글, 상태 배지)
- 문서: `docs/specs/viewer.md` "각기둥·각뿔의 면 트리", `docs/specs/ui.md`

## 리스크/이슈
- 사진 인식(LLM 프롬프트)은 아직 직육면체·정육면체만 읽는다
- 면 표시(◎·숫자)는 학습지 전개도(grid)만 담을 수 있어서 각기둥·각뿔에서는 꺼져 있다
- 겉넓이·부피 설명 모드는 직육면체·정육면체만

## 참고
- 관련 문서: `docs/specs/shape-scene.md`, `docs/specs/viewer.md` "다면체: 면 트리"
