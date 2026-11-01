# 작업 기록 - 사진 인식 기록 모드 (backend)

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
