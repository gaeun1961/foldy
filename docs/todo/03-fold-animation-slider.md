# TODO - 접기 애니메이션 + 슬라이더

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#9](https://github.com/gaeun1961/foldy/issues/9) (작업 전 assignee 지정)
- 선행 TODO: TODO-2 `02-face-split-render.md` ([#8](https://github.com/gaeun1961/foldy/issues/8))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 슬라이더로 십자형 전개도(펼침)와 직육면체(접힘) 사이를 오가며 접히는 과정을 보여준다

## 완료 조건
- [ ] 슬라이더 0 = 십자형 전개도, 1 = 직육면체이고, 중간 값에서는 면이 모서리를 경첩 삼아 연속으로 접힌다
- [ ] 접힘 정도를 `ViewerProps`로 밖에서 넣을 수 있다 (챗봇 화면 조작 TODO-10에서 사용). props 변경은 `docs/02-specs.md`에 먼저 적는다

## 참고
- 관련 문서: `docs/02-specs.md` C. 전개도 `cross`
