# TODO - 단면 보기

- 등록 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#49](https://github.com/gaeun1961/foldy/issues/49) (작업 전 assignee 지정)
- 선행 TODO: TODO-32 `32-solid-of-revolution.md` ([#48](https://github.com/gaeun1961/foldy/issues/48))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 입체를 평면으로 자른 단면 모양을 보여준다 (중학교 회전체와 단면)

## 완료 조건
- [ ] 자르는 평면을 슬라이더로 움직이고, 단면을 강조색으로 칠한다. 나머지 입체는 연하게
- [ ] 회전체: 축에 수직으로 자르면 원, 축을 품게 자르면 회전시킨 평면도형을 두 개 붙인 모양이 된다
- [ ] 다면체(직육면체 등): 자르는 방향(수평·수직·비스듬히)을 고르면 단면이 사각형·삼각형 등으로 바뀐다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/viewer.md`, `docs/specs/ui.md` (친절한 설명 원칙)
- 고등 과정의 원뿔 곡선(원뿔 단면)은 메이커톤 이후 로드맵(`docs/03-product-plan.md` E)이다
