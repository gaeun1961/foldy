# TODO - 닮은 직육면체의 겉넓이비·부피비

- 등록 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#45](https://github.com/gaeun1961/foldy/issues/45) (작업 전 assignee 지정)
- 선행 TODO: TODO-25 `25-cuboid-surface-area.md` ([#40](https://github.com/gaeun1961/foldy/issues/40)), TODO-26 `26-cuboid-volume.md` ([#41](https://github.com/gaeun1961/foldy/issues/41))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 크기를 k배로 하면 겉넓이는 k²배, 부피는 k³배가 되는 이유를 보여준다 (중학교 닮은 입체)

## 완료 조건
- [ ] 원래 직육면체와 k배(예: 2배, 3배) 직육면체를 나란히 놓고 k를 고를 수 있다
- [ ] 겉넓이: 원래 면 하나가 k배 직육면체의 면에 k × k 개 들어가는 모습을 보여준다 (TODO-25의 면 칠하기를 바탕으로)
- [ ] 부피: 원래 직육면체가 k배 직육면체에 k × k × k 개 쌓이는 모습을 보여준다 (TODO-26의 층 쌓기를 바탕으로)
- [ ] 멈춘 뒤 겉넓이비 1 : k², 부피비 1 : k³ 식을 보여준다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/ui.md` (친절한 설명 원칙)
- 1차 다른 TODO보다 뒤 순위다
