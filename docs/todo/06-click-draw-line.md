# TODO - 꼭짓점·모서리 중점 클릭으로 선 긋기

- 등록 일시: 2026-10-21 09:38 (KST), TODO-1 결과(최종 플랜 B)로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#12](https://github.com/gaeun1961/foldy/issues/12) (작업 전 assignee 지정)
- 선행 TODO: TODO-4 `04-face-lines.md` ([#10](https://github.com/gaeun1961/foldy/issues/10))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학생이 꼭짓점이나 모서리 중점을 두 번 클릭해서 면 위에 선분을 직접 그을 수 있게 한다

## 완료 조건
- [ ] 각 면에 모서리 중점 표시점(작은 구)을 자식으로 둔다. 꼭짓점 표시점은 TODO-5의 것을 쓴다
- [ ] `Raycaster`로 클릭한 표시점을 찾아 `(면, { vertex })` 또는 `(면, { edge, t: 0.5 })`로 바꾼다
- [ ] 같은 면 위의 두 점을 클릭하면 선분이 추가되어 바로 보인다. 다른 면이면 추가하지 않고 알려준다
- [ ] 첫 번째로 클릭한 점이 선택된 상태로 보인다
- [ ] 추가된 선분은 콜백 prop(예: `onSceneChange`)으로 UI에 전달된다. 콜백 인자는 ShapeScene(일반 데이터)이고, props 변경은 `docs/specs/viewer.md`에 먼저 적는다
- [ ] `OrbitControls` 드래그(회전)와 클릭이 섞이지 않는다 (마우스를 누른 곳과 뗀 곳이 거의 같을 때만 클릭으로 처리)

## 참고
- 관련 문서: `docs/specs/viewer.md` (클릭), `docs/specs/shape-scene.md` (선분 끝점)
- 펼친 상태에서는 경첩 모서리 양 끝에 복사본 두 개가 겹친다. 어느 복사본이 맞아도 면 정보로 같은 면인지 판단하면 된다
