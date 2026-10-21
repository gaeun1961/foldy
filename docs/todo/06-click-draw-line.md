# TODO - 꼭짓점·모서리 중점 클릭으로 선 긋기

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#12](https://github.com/gaeun1961/foldy/issues/12) (작업 전 assignee 지정)
- 선행 TODO: TODO-4 `04-face-lines.md` ([#10](https://github.com/gaeun1961/foldy/issues/10))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학생이 꼭짓점이나 모서리 중점을 두 번 클릭해서 면 위에 선분을 직접 그을 수 있게 한다

## 완료 조건
- [ ] 같은 면 위의 두 점을 클릭하면 선분이 추가되어 바로 보인다. 다른 면이면 추가되지 않는다
- [ ] 끝점은 `{ vertex }` 또는 `{ edge, t: 0.5 }`로 저장된다
- [ ] 추가된 선분은 콜백 prop(예: `onSceneChange`)으로 UI에 전달된다. props 변경은 `docs/02-specs.md`에 먼저 적는다

## 참고
- 관련 문서: `docs/02-specs.md` C. 선분 끝점
