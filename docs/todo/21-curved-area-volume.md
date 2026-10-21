# TODO - 곡면 도형 겉넓이·부피 시각화

- 등록 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#29](https://github.com/gaeun1961/foldy/issues/29) (작업 전 assignee 지정)
- 선행 TODO: TODO-17 `17-cylinder-roll.md` ([#25](https://github.com/gaeun1961/foldy/issues/25))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 원기둥·원뿔의 겉넓이(전개도 넓이)와 부피를 화면에서 이해할 수 있게 보여준다

## 완료 조건
- [ ] 전개도 상태에서 옆면·밑면의 치수(직사각형 가로 = 밑면 둘레, 부채꼴 호 = 밑면 둘레 등)와 넓이를 표시한다
- [ ] 겉넓이 = 옆면 + 밑면 넓이 합이 크기(`size`)로 계산되어 보인다
- [ ] 부피 공식(원기둥 `πr²h`, 원뿔 `πr²h / 3`)과 값을 보여준다. 표현 방식(예: 원뿔 3개 = 원기둥)은 이 TODO에서 정한다
- [ ] 원뿔은 TODO-18이 끝난 뒤에 붙인다 (원기둥 먼저)

## 참고
- 관련 문서: `docs/03-product-plan.md` D. 범위, `docs/specs/shape-scene.md` (곡면 전개도)
