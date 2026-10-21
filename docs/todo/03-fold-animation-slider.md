# TODO - 접기 애니메이션 + 슬라이더

- 등록 일시: 2026-10-21 09:38 (KST), TODO-1 결과(최종 플랜 B)로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#9](https://github.com/gaeun1961/foldy/issues/9) (작업 전 assignee 지정)
- 선행 TODO: TODO-2 `02-face-split-render.md` ([#8](https://github.com/gaeun1961/foldy/issues/8))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 슬라이더로 직육면체(접힘)와 십자형 전개도(펼침) 사이를 오가며 접히는 과정을 보여준다

## 완료 조건
- [ ] 펼침 값 `s`(0 = 입체, 1 = 전개도)에 따라 각 면 pivot이 회전축을 중심으로 `s × (180° − 이면각)` 회전한다 (직육면체는 `s × 90°`). 면 트리만 쓰고 도형 이름으로 분기하지 않는다
- [ ] 화면에 슬라이더가 있고, 움직이면 면이 연속으로 접히고 펴진다
- [ ] "펼치기/접기" 버튼으로 0↔1 애니메이션이 된다 (`requestAnimationFrame`)
- [ ] 펼침 정도를 `ViewerProps`로 밖에서 넣을 수 있다 (챗봇 화면 조작 TODO-10에서 사용). 값은 숫자 하나로 두고, props 변경은 `docs/02-specs.md`에 먼저 적는다

## 참고
- 관련 문서: `docs/02-specs.md` B(three.js 뷰어 규칙), C. 전개도 `cross`
- 동작 참고: `frontend/lab/geogebra.html`의 슬라이더와 애니메이션 버튼
