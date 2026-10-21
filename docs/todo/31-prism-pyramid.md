# TODO - 각기둥·각뿔 면 트리 데이터와 전개도

- 등록 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#47](https://github.com/gaeun1961/foldy/issues/47) (작업 전 assignee 지정)
- 선행 TODO: TODO-3 (완료, [리포트](../reports/T03-fold-animation-slider.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 각기둥(삼각기둥, 오각기둥 등)과 각뿔(삼각뿔, 사각뿔 등)을 전개도에서 접어 볼 수 있게 한다

## 완료 조건
- [ ] ShapeScene에 각기둥·각뿔 도형 종류와 크기(밑면 변 수, 치수)를 추가한다. 계약 변경 규칙대로 이슈로 합의하고 `docs/specs/shape-scene.md`부터 고친 뒤 `types.ts`, `schema.py`, 목 데이터를 같은 PR에서 고친다
- [ ] `polyhedra.ts`에 각기둥·각뿔 면 트리 데이터(기본 전개도 하나, 단계별 접기 순서 `foldOrder`)를 추가한다. 렌더링 코드는 도형 이름으로 분기하지 않는다
- [ ] `npm test`가 각기둥·각뿔의 `s = 0`(입체)과 `s = 1`(평면 전개도)을 검사한다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/shape-scene.md`, `docs/specs/viewer.md` (면 트리, 단계별 접기), `docs/design/net-folding-ref-pyramid.png` (사각뿔 시안)
- 정다면체 데이터(TODO-16)와 같은 방식이다
