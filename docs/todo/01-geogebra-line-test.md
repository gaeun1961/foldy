# TODO - GeoGebra 선 연동 테스트 → 플랜 A/B 결정

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#7](https://github.com/gaeun1961/foldy/issues/7) (작업 전 assignee 지정)
- 선행 TODO: 없음

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- GeoGebra 임베드로 전개도 접기와 면 위 선분이 함께 움직이는지 확인하고, 뷰어를 GeoGebra(플랜 A)로 갈지 three.js(플랜 B)로 갈지 정한다

## 완료 조건
- [ ] GeoGebra로 직육면체 전개도 + 선분 1개를 접었다 펴는 작은 프로토타입을 만들어 확인했다
- [ ] 판단 기준(선분이 면을 따라 움직이는지, 꼭짓점 라벨 표시, 로딩 속도, 슬라이더·하이라이트를 밖에서 조작할 수 있는지)별 결과와 A/B 결정을 `docs/reports/`에 기록했다
- [ ] 결정을 `docs/02-specs.md` A(3D 항목)에 반영했다

## 참고
- 관련 문서: `docs/02-specs.md` B. 구현 규칙 (뷰어는 `ViewerProps` 뒤에)
