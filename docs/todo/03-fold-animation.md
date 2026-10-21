# TODO - 전개도 접기 애니메이션

- 등록 일시: 2026-10-21 09:16 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 진행 시점: 뷰어 플랜 A/B 결정 후 (3D 담당)

> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 십자형 전개도가 직육면체로 접히는 과정을 애니메이션으로 보여준다

## 요구사항
- `net.layout = "cross"` 배치 기준 (`docs/02-specs.md`)
- 펼침 ↔ 접힘을 오갈 수 있고, 중간 단계에서 멈춰 볼 수 있다
- 챗봇·UI가 제어할 수 있도록 필요한 props는 이슈로 합의 후 `ViewerProps`에 추가

## 작업 요약
- 면 6개를 경첩 모서리 기준으로 회전시키는 방식으로 구현

## 선행조건
- `01-geogebra-line-test.md` 결정

## 참고
- 관련 문서: `docs/02-specs.md`, `frontend/src/viewer/`
- todo-list 한 줄 요약: 십자형 전개도 접기 애니메이션
