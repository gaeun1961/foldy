# TODO - GeoGebra 선 연동 테스트 (플랜 A/B 결정)

- 등록 일시: 2026-10-21 09:16 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 진행 시점: 접기·선 긋기 구현 전 (3D 담당, 사전 개발 초반)

> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- GeoGebra 임베드로 면 위 선분 표시와 접기 연동이 되는지 확인하고, 뷰어 구현 방향(플랜 A/B)을 정한다

## 요구사항
- 플랜 A: GeoGebra 임베드. 직육면체 + 전개도 + 면 위 선분을 ShapeScene 값으로 그리고, 접기와 선이 함께 움직이는지 확인
- 플랜 B: three.js 자체 구현 유지 (현재 `ThreeViewer`)
- 판단 기준: 선분이 접힐 때 면을 따라 움직이는지, 라벨 표시, 로딩 속도, 챗봇이 화면을 조작할 수 있는 API가 있는지

## 작업 요약
- GeoGebra 임베드로 작은 프로토타입을 만들어 위 기준을 확인
- 결과와 결정(A/B)을 `docs/reports/`에 기록하고, A면 `ViewerProps`를 따르는 GeoGebra 구현을 `frontend/src/viewer/`에 추가

## 선행조건
- 없음

## 참고
- 관련 문서: `docs/02-specs.md` B. 구현 규칙 (뷰어는 인터페이스 뒤에)
- todo-list 한 줄 요약: GeoGebra 임베드로 선 연동 가능 여부 확인 후 뷰어 플랜 A/B 결정
