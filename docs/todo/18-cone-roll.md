# TODO - 원뿔 말기 애니메이션

- 등록 일시: 2026-10-21 12:01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#26](https://github.com/gaeun1961/foldy/issues/26) (작업 전 assignee 지정)
- 선행 TODO: TODO-17 `17-cylinder-roll.md` ([#25](https://github.com/gaeun1961/foldy/issues/25))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 원뿔 옆면 부채꼴이 `s`에 따라 원뿔로 말리고, 밑면 원이 접히는 애니메이션을 만든다

## 완료 조건
- [ ] 옆면을 전개도 부채꼴(반지름 = 모선 길이 `L`, 중심각 `360° × radius / L`) 위 격자 정점으로 만든다
- [ ] `s`에 따라 모선 길이는 그대로 두고, 밑면 반지름을 `radius`에서 `L`까지 늘린 원뿔에 감는다 (`L`이면 평면). 길이가 늘거나 줄지 않는다
- [ ] 밑면 원은 부채꼴 호의 가운데(`seam + 180`)에 붙고, 접점의 접선을 축으로 `s × 90°` 회전한다
- [ ] 원기둥(TODO-17)과 같은 `curved.ts` 구조를 쓰고, 꼭짓점 라벨(`vertexLabels[0]`)을 꼭짓점에 표시한다

## 참고
- 관련 문서: `docs/02-specs.md` B(곡면 도형), C. 곡면 전개도
