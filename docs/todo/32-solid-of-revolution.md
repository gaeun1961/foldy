# TODO - 회전체 만들기

- 등록 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#48](https://github.com/gaeun1961/foldy/issues/48) (작업 전 assignee 지정)
- 선행 TODO: TODO-17 `17-cylinder-roll.md` ([#25](https://github.com/gaeun1961/foldy/issues/25)), TODO-18 `18-cone-roll.md` ([#26](https://github.com/gaeun1961/foldy/issues/26))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 평면도형을 한 직선(축)을 중심으로 돌리면 입체(회전체)가 되는 것을 보여준다 (중학교 회전체)

## 완료 조건
- [ ] 직사각형 → 원기둥, 직각삼각형 → 원뿔, 반원 → 구가 되는 회전 애니메이션. 회전축은 굵게 강조한다
- [ ] 회전 각도를 슬라이더로 직접 조절할 수 있다 (0° = 평면도형, 360° = 회전체)
- [ ] 원기둥·원뿔은 `curved.ts`(TODO-17·18)의 곡면 모양과 같은 치수로 맞는다
- [ ] 구가 ShapeScene에 없으면 계약 변경 규칙을 따른다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/viewer.md` (곡면 도형), `docs/specs/ui.md` (친절한 설명 원칙)
