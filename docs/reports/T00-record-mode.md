# 작업 기록 - 사진 인식 기록 모드 (backend)

## #160 frontend 후속 검증 (2026-11-01, KST)

- 작성자: Phodo / 에이전트: Codex
- `feature/160-record-mode-ui`에 최신 main(e9767d0)을 합쳤다. 테스트 출력 문구 충돌은 `/record` 검사를 유지해 해결했다.
- 기준 사진의 묶음 ID 앞 6자와 초 단위 시각으로 폴더를 만들면 서로 다른 사진의 기록이 섞일 수 있었다. 전체 ID의 SHA-256으로 폴더를 구분하고, 서버 재시작 뒤에도 같은 묶음에 이어 쓴다. 옛 폴더는 `session.json`의 전체 ID로 찾는다.
- 인식 요청이 네트워크에서 실패하면 다음 읽기에 원본 사진을 다시 보낸다. 원본 전송 성공 표시는 첫 요청이 성공한 뒤에만 한다. 네모 전체 지우기도 `removed`에 남긴다.
- 최신 main의 `ResizeObserver(resize)`는 콜백의 배열 인자를 boolean 인자로 받아 타입 검사가 실패했다. `() => resize()`로 연결해 인자 혼동을 없앴다. 카메라 기능 변경은 없다.
- 검증: frontend build·lint·전체 테스트, backend ruff 검사·포맷·4개 검사 모듈 통과. lint에는 기존 EmptyBook 훅 의존성 경고 1개가 남는다.
- 일반 배포 번들에서 `/record`, 기록 결과 UI 문구, `photoSent`가 빠지는 것을 검사했다.
- PC(1280px)·모바일 크기/터치 설정 Chromium(390px)에서 합성 사진 → 네트워크 실패 → 재시도 → 맞음·틀림을 실행하고 실제 backend `session.json`과 대조했다. 인식만 시험용 응답으로 교체했고 LLM은 호출하지 않았다. 개발 서버도 실행해 화면을 확인했다.
- 실제 휴대폰 검증은 아직 하지 않았다. 에뮬레이션을 실기기 완료로 처리하지 않는다. PR 머지 전 실기기 검증 또는 사용자 확인이 필요하다.
- 시험 스크립트·결과: 로컬 `D:/_개발/foldy-test-plan/record-browser-test.mjs`, `record-browser-results.json`. 학습지 사진은 추가·커밋하지 않았다.

- 일시: 2026-10-31 21:00~21:50 (KST)
- 작성자: Phodo
- 에이전트: Claude Code
- 작업 유형: 기능 추가 (개발 모드 전용)

## 요약
- "찾았어요"인데 결과가 엉뚱하거나(3-2 를 올렸는데 29번 겨냥도) 느릴 때, 무엇이 들어왔고 어디서 나왔는지 남은 것이 없어 원인을 못 찾았다 (agy 대화 DB 까지 뒤졌지만 미해결)
- `VISION_RECORD=1` 일 때만 `/analyze` 읽기 한 번을 `backend/evals/cases/{날짜_시각}_{묶음}/read-N/` 에 남긴다: 받은 도형·문제 칸 사진, 결과(실패면 에러와 422·503), 출처(cache·agy·api·cli), 모델, 문제 글을 어디서 읽었는지, agy 마다 걸린 초·대기 프로세스를 썼는지·하나 더 보냈는지, 사진 sha256
- 응답 뒤 따로(스레드) 쓴다. 실패 응답도 남기려고 BackgroundTasks 대신 스레드. 끄면 아무것도 안 쓰고 `record`·`photo` 필드도 무시
- 기록판은 contextvar. run_in_threadpool 은 넘겨 주고, 문제 글 스레드는 copy_context 로, agy 하나 더 보내기 스레드는 기록판을 직접 받는다

## 확인
- 검사(test_analyze): 꺼지면 안 씀, 켜면 폴더·사진·결과·session.json 합치기·원본 한 번, 같은 묶음 두 번째는 read-2 이고 출처 cache, 실패(422)·깨진 record 도 남김
- 실제 흐름(29번 두 도형, agy): 폴더 둘, 도형 ① 10.7초(문제 글 agy 8.5초 함께), ② 17.6초, 모두 대기 프로세스 씀·하나 더 없음

## 변경 범위
- backend: `ai/record.py`(새), `ai/vision.py`(출처·문제 글 적기, 문제 글 스레드에 기록판), `ai/agy.py`(agy 시간 적기), `api/routes.py`(`record`·`photo` 선택 필드, 응답 뒤 쓰기), `tests/test_analyze.py`
- 문서: api.md 기록 모드 한 단락, worksheets.md H, 01, `.env.example`, `.gitignore`

## 리스크/이슈
- 사진이 쌓인다 (저작권·학생 사진). git 무시, 배포 서버에서는 켜지 않는다
- frontend 가 보낼 묶음 id·추천 네모·학생 네모는 #160 (지금은 묶음 없이 읽기마다 폴더 하나)

## 다음 작업
- #160 frontend 기록, #161 증류·정답 은행

## 참고
- 관련 문서: docs/specs/worksheets.md H, docs/specs/api.md, 계획 https://claude.ai/artifact/CppSvJACoMhwz2adazrbMm
