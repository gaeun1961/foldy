# 작업 기록 - 진행 중 동작 입력 잠금 (#167)

- 일시: 2026-11-01 (KST)
- 작성자: Phodo / 에이전트: Codex
- 작업 유형: 버그 수정

## 변경

- UI 동작 저장소가 각 동작의 종료 토큰을 별도로 관리한다. 늦은 종료가 다음 동작을 해제하지 않는다.
- 잠긴 앱은 inert, 입력 캡처와 터치 차단막으로 키보드·연타·3D 입력까지 차단한다. 기존 패널은 숨기고 현재 동작의 버튼 하나만 표시한다.
- 사진·챗봇 취소는 AbortController와 요청 동일성 검사로 늦은 결과를 무시한다. 취소 후 수동 입력을 사용할 수 있다.
- 접기·설명은 현재 진행값에서 멈춘다. 오프닝·페이지 넘김·펜은 완성 상태로 건너뛴다. 펜은 책상으로 돌아올 때까지 잠근다.
- 사진 준비·종이 펴기·보관함 읽기도 처리 중 입력을 막고 실패 후 해제한다.
- 잠금 표시는 기존 secondary-button을 재사용한다. 색·그림자·사진 프레임·보고서 순서도는 index.css 및 ui.md 토큰을 기준으로 한다.

## 검증

- frontend build·lint·전체 테스트 통과. backend ruff check·format 및 schema/chat/vision_eval/analyze 통과.
- Chromium PC 1280px·터치 390px: 오프닝 건너뛰기, 접기 시작 100/800/1800ms의 모든 버튼·입력·캔버스에 click/pointerdown/wheel/keydown 주입, 멈춘 값 유지, 설명 멈춤, 인식 취소 후 늦은 결과 무시, 페이지·펜 건너뛰기, 챗봇 취소, 재생 중 화면 크기 변경을 검사했다.
- 개발 서버 실행 및 화면 확인. 가짜 인식 응답과 합성 이미지로 LLM 호출 없이 검사했다.
- 로컬 시험 스크립트: D:/_개발/foldy-test-plan/interaction-test.mjs. 결과: interaction-results.json.
- 추가 경계 검사: 종료 버튼 위 wheel/Ctrl+wheel, 두 손가락 touchstart, touchmove, Ctrl+확대 키도 차단하고 Enter 종료는 허용한다. activity-button-test.mjs와 activity-button-results.json으로 확인했다.
- Android 에뮬레이터는 자동 승인 검토의 Chrome 실행 거절로 미검증. 전체 O1~O14×I1~I34 조합을 모두 실행했다고 주장하지 않는다.

## 의존성

- #160 PR #180 위에서 검증한다. 사용자 지시에 따라 검증 차단 중에도 다음 이슈를 진행했으며 #160 이전에는 머지하지 않는다.
