# TODO - 면 트리 기반 다면체 렌더링 (직육면체부터)

- 등록 일시: 2026-10-21 09:38 (KST), 2026-10-21 12:01 도형 확장(#23)으로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#8](https://github.com/gaeun1961/foldy/issues/8) (작업 전 assignee 지정)
- 선행 TODO: TODO-1 (완료, [리포트](../reports/261021-1135-T01-geogebra-line-check.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 다면체를 "면 트리" 데이터로 그리는 구조를 만들고, 직육면체·정육면체를 이 구조로 그린다. 정다면체는 나중에 데이터만 추가하면 되게 한다 (TODO-16)

## 완료 조건
- [ ] `frontend/src/viewer/polyhedra.ts`에 면 트리 데이터 형식(면의 꼭짓점 목록, 부모 면, 붙는 모서리, 이면각)과 꼭짓점 좌표 계산(크기 → 좌표)을 둔다
- [ ] **직육면체가 면 트리 데이터로 그려진다** (`docs/specs/viewer.md`의 직육면체 면 트리 표). 정육면체도 같은 데이터로 그려진다 (`size.edge`)
- [ ] 렌더링 코드는 도형 이름으로 분기하지 않고, 면 트리를 따라 pivot `Group`과 면 메시를 만든다
- [ ] 회전각이 0이면 지금과 같은 직육면체로 보이고, 회전각을 임시로 `180° − 이면각`으로 바꾸면 `cross` 모양으로 펼쳐지는 것을 확인했다 (슬라이더는 TODO-3)
- [ ] 각 면이 자기 꼭짓점 인덱스 목록을 알고 있다 (`(면, 꼭짓점)` 복사본 매핑의 기초. TODO-4~6에서 사용)
- [ ] 마우스 회전(`OrbitControls`)은 그대로 동작한다. `ViewerProps`는 바꾸지 않는다

## 참고
- 관련 문서: `docs/specs/viewer.md` (다면체), `docs/specs/shape-scene.md` (꼭짓점 인덱스 규칙, 전개도 `cross`)
- 펼친 모양 참고: `frontend/lab/geogebra.html`에서 s = 1
