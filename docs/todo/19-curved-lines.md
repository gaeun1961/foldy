# TODO - 곡면 도형 위 선 그리기

- 등록 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#27](https://github.com/gaeun1961/foldy/issues/27) (작업 전 assignee 지정)
- 선행 TODO: TODO-18 `18-cone-roll.md` ([#26](https://github.com/gaeun1961/foldy/issues/26))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 원기둥·원뿔의 `scene.lines`를 그리고, 전개도 위 직선이 말릴 때 곡면을 따라 감기게 한다

## 완료 조건
- [ ] 끝점(`top`/`bottom`/`apex`/`base`/`surface`)을 전개도 좌표로 바꾼다 (`docs/02-specs.md` C의 곡면 전개도 식)
- [ ] 전개도 위에서 두 끝점을 잇는 직선을 잘게 나눈 점들(예: 64개)에 옆면과 같은 말기 변환을 적용해서 그린다
- [ ] 원기둥 예시(밑면 0° → 윗면 360°, 실 한 바퀴)가 `s = 1`에서 직사각형 대각선, `s = 0`에서 나선으로 보인다
- [ ] 선이 곡면에 묻히거나 깜빡이지 않는다 (곡면 바깥쪽으로 살짝 띄우기)

## 참고
- 관련 문서: `docs/02-specs.md` B(곡면 위 선), C. 선분 끝점(원기둥형·원뿔형), 예시
