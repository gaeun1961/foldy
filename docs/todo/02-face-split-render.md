# TODO - three.js 면 6개 계층 구조 렌더링

- 등록 일시: 2026-10-21 09:38 (KST), TODO-1 결과(최종 플랜 B)로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#8](https://github.com/gaeun1961/foldy/issues/8) (작업 전 assignee 지정)
- 선행 TODO: TODO-1 (완료, [리포트](../reports/261021-1135-01-geogebra-line-check.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- `ThreeViewer`의 직육면체를 하나의 상자 대신 면 6개로 만들고, cross 배치 기준의 부모-자식 계층과 회전축(pivot)을 잡아 TODO-3~6이 그 위에 올라가게 한다

## 완료 조건
- [ ] 면 6개가 `docs/02-specs.md` B "three.js 뷰어 규칙"의 표대로 부모-자식 계층을 이룬다 (앞면 고정, 뒷면은 오른쪽의 자식)
- [ ] 각 면은 접히는 모서리 위치에 pivot `Group`을 두고, 그 안에 면 메시를 배치한다. 회전각이 0이면 지금과 같은 직육면체로 보인다
- [ ] 각 면이 자기 꼭짓점 인덱스 4개를 알고 있다 (`(면, 꼭짓점)` 복사본 매핑의 기초. TODO-4~6에서 사용)
- [ ] 회전각을 임시로 90°로 바꿔 보면 C의 `cross` 모양으로 펼쳐지는 것을 확인했다 (슬라이더는 TODO-3)
- [ ] 마우스 회전(`OrbitControls`)은 그대로 동작한다. `ViewerProps`는 바꾸지 않는다

## 참고
- 관련 문서: `docs/02-specs.md` B(three.js 뷰어 규칙), C. 꼭짓점 인덱스 규칙, 전개도 `cross`
- 펼친 모양 참고: `frontend/lab/geogebra.html`에서 s = 1
