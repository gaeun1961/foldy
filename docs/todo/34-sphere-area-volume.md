# TODO - 구의 겉넓이·부피

- 등록 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#50](https://github.com/gaeun1961/foldy/issues/50) (작업 전 assignee 지정)
- 선행 TODO: TODO-27 `27-circle-area.md` ([#42](https://github.com/gaeun1961/foldy/issues/42))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 구의 겉넓이 4πr²와 부피 4/3πr³를 눈으로 이해하게 한다 (중학교 구의 겉넓이·부피)

## 완료 조건
- [ ] 겉넓이: 구의 겉면이 반지름이 같은 원 4개의 넓이와 같다는 것을 보여준다 (예: 구를 감은 실을 풀어 원 4개를 채우기). 원의 넓이는 TODO-27을 바탕으로 한다
- [ ] 부피: 반지름 r, 높이 2r인 원기둥에 구를 넣으면 부피가 원기둥의 2/3라는 것을 보여준다 (예: 물 붓기)
- [ ] 멈춘 뒤 4πr², 4/3πr³ 식과 값을 보여준다
- [ ] 구가 ShapeScene에 없으면 계약 변경 규칙을 따른다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/ui.md` (친절한 설명 원칙), `docs/todo/21-curved-area-volume.md`
