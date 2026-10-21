# TODO - 직육면체 겉넓이 시각화

- 등록 일시: 2026-10-21 16:05 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#40](https://github.com/gaeun1961/foldy/issues/40) (작업 전 assignee 지정)
- 선행 TODO: TODO-24 (완료, [리포트](../reports/T24-step-fold.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 전개도로 직육면체 겉넓이가 2×(ab+bc+ca)인 이유를 눈으로 보여준다

## 완료 조건
- [ ] 펼친 상태에서 마주 보는 면 쌍(앞·뒤, 왼·오, 위·아래)을 한 쌍씩 차례로 같은 색으로 칠한다. 지금 칠하는 쌍만 강조한다
- [ ] 다 칠한 뒤 멈춘 상태에서 면 넓이(ab, bc, ca)와 2×(ab+bc+ca) 식과 값을 보여준다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/ui.md` (친절한 설명 원칙), `docs/specs/viewer.md` (단계별 접기의 강조 방식)
- 1차 다른 TODO보다 뒤 순위다
