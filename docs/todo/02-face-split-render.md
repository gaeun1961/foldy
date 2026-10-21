# TODO - 직육면체를 면 6개로 분리해서 렌더링

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#8](https://github.com/gaeun1961/foldy/issues/8) (작업 전 assignee 지정)
- 선행 TODO: TODO-1 `01-geogebra-line-test.md` ([#7](https://github.com/gaeun1961/foldy/issues/7))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 접기를 할 수 있도록 직육면체를 하나의 상자가 아니라 따로 움직일 수 있는 면 6개로 그린다

## 완료 조건
- [ ] 면 6개가 각각 따로 렌더링되고, 합쳐진 모습은 지금 직육면체와 같다
- [ ] 면과 꼭짓점 인덱스의 대응이 `docs/02-specs.md`의 면 규칙(앞면 0-1-5-4 등)과 일치한다
- [ ] 마우스 회전은 그대로 동작한다

## 참고
- 관련 문서: `docs/02-specs.md` C. 꼭짓점 인덱스 규칙
