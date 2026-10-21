# TODO - 원기둥 말기 애니메이션

- 등록 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#25](https://github.com/gaeun1961/foldy/issues/25) (작업 전 assignee 지정)
- 선행 TODO: TODO-2 (완료, [리포트](../reports/T02-face-tree.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 원기둥 옆면 직사각형이 `s`에 따라 원기둥으로 말리고, 위·아래 원이 접히는 애니메이션을 만든다

## 완료 조건
- [ ] `frontend/src/viewer/curved.ts`에 곡면 도형 모듈을 둔다 (면 트리와 분리)
- [ ] 옆면을 전개도 직사각형(가로 `2π × radius`, 세로 `height`) 위 격자 정점으로 만들고, `s`에 따라 반지름 `radius / (1 − s)`인 원기둥에 감는다 (`s = 1`이면 평면). 길이가 늘거나 줄지 않는다
- [ ] 위·아래 원은 직사각형 위·아래 변의 가운데(`seam + 180`)에 붙고, 접점의 접선을 축으로 `s × 90°` 회전한다
- [ ] `net.seam` 각도에서 잘린 전개도가 된다
- [ ] 슬라이더(TODO-3)로 0 ↔ 1이 연속으로 움직인다

## 참고
- 관련 문서: `docs/specs/viewer.md` (곡면 도형), `docs/specs/shape-scene.md` (곡면 전개도)
