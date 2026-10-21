# TODO - 보이지 않는 모서리 점선 표시 + 보기 옵션 토글

- 등록 일시: 2026-10-21 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#38](https://github.com/gaeun1961/foldy/issues/38) (작업 전 assignee 지정)
- 선행 TODO: TODO-3 `03-fold-animation-slider.md` ([#9](https://github.com/gaeun1961/foldy/issues/9))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 면에 가려 안 보이는 모서리를 점선으로 보여준다 (교과서 겨냥도처럼). 상자를 접었을 때 뒤쪽 모서리가 어디 있는지 보인다
- 3D 뷰 보기 옵션을 체크박스로 끄고 켤 수 있게 하고, 첫 항목으로 "보이지 않는 모서리 점선"을 넣는다

## 완료 조건
- [ ] 가려진 모서리(또는 모서리의 가려진 부분)만 점선으로, 보이는 부분은 지금처럼 실선으로 그린다. 화면을 돌리거나 접고 펴도 그때그때 맞게 바뀐다
- [ ] 보기 옵션 체크박스 영역이 조작 패널에 있고(`docs/specs/ui.md` 화면 배치 6번), "보이지 않는 모서리 점선"으로 켜고 끈다
- [ ] 보기 옵션 값은 `ViewerProps`로 넘긴다. props 변경은 `docs/specs/viewer.md`에 먼저 적는다 (숫자·불리언 같은 일반 데이터만, three.js 타입 금지)
- [ ] 다른 보기 옵션(꼭짓점 라벨 TODO-5, 맞닿는 모서리 색 TODO-22 등)은 이 TODO에서 만들지 않는다. 그 TODO들이 같은 체크박스 영역에 항목을 더할 수 있게만 둔다

## 참고
- 관련 문서: `docs/specs/viewer.md` (공통, 바닥에 눕히기), `docs/specs/ui.md` (화면 배치, 보기 옵션)
- 시안: `docs/design/net-folding-ref-pyramid.png` (보기 옵션 체크박스)
- 구현 힌트: 모서리 선을 두 번 그린다. 한 번은 지금 실선, 한 번은 `LineDashedMaterial`(`computeLineDistances()` 필요)에 `depthFunc: THREE.GreaterDepth`로 면 뒤에 있는 부분만 보이게 한다
- 기본값(켬/끔)은 시작할 때 정해서 ui.md에 적는다 (제안: 켬)
