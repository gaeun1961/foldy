# TODO - 곡면 도형 선 입력

- 등록 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#28](https://github.com/gaeun1961/foldy/issues/28) (작업 전 assignee 지정)
- 선행 TODO: TODO-19 `19-curved-lines.md` ([#27](https://github.com/gaeun1961/foldy/issues/27)), TODO-6 (완료, [리포트](../reports/T06-click-draw-line.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 원기둥·원뿔의 전개도 상태(`s = 1`)에서 두 점을 클릭해 선을 긋는다

## 완료 조건
- [ ] 전개도 상태에서만 입력을 받는다 (말린 상태에서는 클릭해도 선을 만들지 않고 안내)
- [ ] 클릭 위치를 전개도 좌표로 바꿔 끝점을 만든다. 둘레 위면 `top`/`bottom`/`base`, 꼭짓점 근처면 `apex`, 그 밖은 `surface`
- [ ] 두 점을 클릭하면 선이 추가되고, `onSceneChange`(TODO-6과 같은 콜백)로 UI에 전달된다
- [ ] 추가한 선을 접어 보면(TODO-19) 곡면을 따라 감긴다

## 참고
- 관련 문서: `docs/specs/viewer.md` (곡면 선 입력), `docs/specs/shape-scene.md` (곡면 전개도)
