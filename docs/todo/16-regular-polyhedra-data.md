# TODO - 정다면체 4종 면 트리 데이터 추가

- 등록 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#24](https://github.com/gaeun1961/foldy/issues/24) (작업 전 assignee 지정)
- 선행 TODO: TODO-3 `03-fold-animation-slider.md` ([#9](https://github.com/gaeun1961/foldy/issues/9))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 정사면체·정팔면체·정십이면체·정이십면체를 `polyhedra.ts`에 **데이터만 추가해서** 그리고 접을 수 있게 한다

## 완료 조건
- [ ] 4종 각각의 꼭짓점 좌표(`size.edge` → 좌표)가 `docs/specs/shape-scene.md`의 꼭짓점 인덱스 규칙과 일치한다
- [ ] 4종 각각의 면 목록과 면 트리(기본 전개도: 부모 면, 붙는 모서리, 이면각)를 정의했다. 펼쳤을 때 면끼리 겹치지 않는다
- [ ] 렌더링·접기 코드는 고치지 않았다 (고쳐야 했다면 면 트리 형식이 부족한 것이므로 `docs/specs/viewer.md`부터 고친다)
- [ ] 4종 모두 슬라이더 0 → 1로 입체 ↔ 전개도가 되는 것을 확인했다

## 참고
- 관련 문서: `docs/specs/viewer.md` (다면체: 면 트리, 정다면체 이면각), `docs/specs/shape-scene.md` (꼭짓점 인덱스 규칙)
- 꼭짓점 좌표는 표준 좌표(예: 황금비 φ를 쓰는 정이십면체·정십이면체 좌표)를 회전해서 규칙의 자세에 맞춘다
