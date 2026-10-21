# TODO - 같은 꼭짓점을 같은 색으로 하이라이트

- 등록 일시: 2026-10-21 09:38 (KST), TODO-1 결과(최종 플랜 B)로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#11](https://github.com/gaeun1961/foldy/issues/11) (작업 전 assignee 지정)
- 선행 TODO: TODO-3 `03-fold-animation-slider.md` ([#9](https://github.com/gaeun1961/foldy/issues/9))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 전개도로 펼쳤을 때 여러 곳에 나뉘어 보이는 같은 꼭짓점(접으면 만나는 점)을 같은 색으로 보여준다

## 완료 조건
- [ ] 각 면이 자기 꼭짓점 4개의 표시점(작은 구)과 라벨(`vertexLabels`)을 자식으로 가진다
- [ ] 꼭짓점 인덱스마다 색을 하나 정하고, 같은 인덱스의 복사본 `(면, 꼭짓점)`을 모두 같은 색으로 칠한다. 펼치면 한 꼭짓점이 최대 3곳에 같은 색으로 보인다
- [ ] 특정 꼭짓점만 강조하고 나머지는 흐리게 하는 값(꼭짓점 인덱스 목록)을 `ViewerProps`로 넣을 수 있다 (챗봇 화면 조작 TODO-10에서 사용). props 변경은 `docs/specs/viewer.md`에 먼저 적는다

## 참고
- 관련 문서: `docs/specs/viewer.md` (꼭짓점 복사본), `docs/specs/shape-scene.md` (꼭짓점 인덱스 규칙)
- 동작 참고: `frontend/lab/geogebra.html`의 "꼭짓점 ㄱ 하이라이트" 버튼
- 라벨은 `CSS2DRenderer`나 Sprite 텍스처 중 하나를 고른다
