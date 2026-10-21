# 작업 기록 - ShapeScene 도형 확장과 뷰어 설계 일반화

- 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 계약 변경 / 설계 / 문서

## 요약
- ShapeScene이 정다면체 5종(정육면체 포함), 원기둥, 원뿔을 담도록 계약을 바꿨다. `shape` 값에 따라 `size`, 꼭짓점 수, 선 끝점 형식, `net`이 정해진다
- 곡면 위 선은 "전개도 위의 직선"으로 정의했다 (실 감기 최단 거리와 같음)
- 뷰어 설계를 다면체 = 면 트리(접기 각도 `s × (180° − 이면각)`), 곡면 도형 = 별도 모듈(굽힘 정도 보간)로 일반화했다
- TODO-2를 "면 트리 기반 다면체 렌더링 (직육면체부터)"로 바꾸고, TODO-16~21(정다면체, 원기둥·원뿔, 곡면 선, 겉넓이·부피)을 추가했다. 우선순위는 1차 직육면체 → 2차 정다면체 → 3차 곡면 도형

## 변경 범위
- 계약: `docs/02-specs.md` C, `frontend/src/shared/types.ts`, `backend/app/ai/schema.py` (판별 유니온, `ShapeScene`은 `RootModel`이라 `ShapeScene.model_validate`는 그대로)
- 뷰어 규칙: `docs/02-specs.md` B (공통 / 다면체 면 트리 / 곡면 도형)
- 코드 영향: `ThreeViewer`는 직육면체·정육면체만 그림(정육면체는 `size.edge`), 목 데이터 타입 `CuboidScene`, lab 타입 이름 수정
- 검사 추가: `backend/tests/test_schema.py` (도형별 정상 5건, 실패 9건)
- 문서: 01(viewer 예정 파일, backend/tests), 03(단계별 범위), AGENTS.md(우선순위 체크, 검사 명령), README
- TODO: TODO-2·3·12 수정, TODO-16~21 추가(이슈 #24~#29, 라벨 `3d`), 이슈 #8 제목 변경, 목록에 단계 칸 추가

## 주요 변경 파일
- `docs/02-specs.md`, `frontend/src/shared/types.ts`, `backend/app/ai/schema.py`, `backend/tests/test_schema.py`
- `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/shared/mock.ts`, `frontend/lab/geogebra.ts`
- `docs/todo/00-todo-list.md`, `docs/todo/02·03·12·16~21-*.md`, `docs/03-product-plan.md`, `docs/01-folder-architecture.md`, `AGENTS.md`, `README.md`

## 결정 사항 (요청에 없던 것)
- **정육면체 `size`는 `{ edge }`**: 기존 `{ width, depth, height }`에서 바꿨다. 정다면체와 같은 형식이다
- **`net.seam`(곡면 도형, 기본 0)**: 옆면을 자르는 각도다. 각도 값은 `seam ~ seam + 360`으로 쓴다. 실을 한 바퀴 감는 선(예: 0° → 360°)을 표현하려면 전개도의 왼쪽 끝과 오른쪽 끝을 구분해야 해서 넣었다
- **곡면 끝점 좌표**: 크기와 무관한 정규화 좌표를 쓴다. 원기둥 `surface: { angle, h }`(h: 0~1), 원뿔 `surface: { angle, r }`(r: 꼭짓점 0 ~ 밑면 1). 실제 전개도 위치로 바꾸는 식은 02-specs C에 있다
- **정다면체 꼭짓점 번호**: 위에서 볼 때 앞에서 시작해 반시계로 도는 고리 규칙으로 정했다. 정십이면체는 윗면이 수평인 자세다
- **직육면체 면의 꼭짓점 순서**: 바깥에서 볼 때 반시계로 다시 적었다 (예: 왼쪽 0-4-7-3). 면에 들어가는 꼭짓점은 같고 순서만 바뀌었다
- **말기 보간**: 위치를 직선으로 섞으면 면이 줄었다 늘어나므로, 굽힌 정도(원기둥 반지름 `radius / (1 − s)`, 원뿔 밑면 반지름 `radius → L`)를 보간한다

## 리스크/이슈
- backend는 꼭짓점 인덱스 범위만 검사한다. "두 끝점이 같은 면 위"인지는 면 목록이 `polyhedra.ts`(TODO-2, 16)에 생긴 뒤에 뷰어가 확인한다
- 곡면 도형에서 꼭짓점이 아닌 점(예: 점 A, B)에 라벨을 붙이는 방법은 아직 없다. 문제 풀이에 필요하면 이슈로 계약을 추가한다
- 정다면체 4종의 면 목록은 아직 문서에 없다. TODO-16에서 데이터로 정의한다

## 다음 작업
- TODO-2 (#8): 면 트리 기반 다면체 렌더링 (직육면체부터)

## 참고
- 관련 문서: 이슈 #23, `docs/02-specs.md` B·C
