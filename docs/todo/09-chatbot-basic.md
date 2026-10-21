# TODO - 챗봇 기본 응답: 힌트형 시스템 프롬프트, 현재 ShapeScene을 맥락으로 /chat 연결

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: AI
- 담당자:
- 선행 TODO: 없음

> 시작 전에 `docs/todo/00-todo-list.md`와 이 파일의 담당자 칸에 이름을 적습니다.
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- `POST /chat`이 현재 도형을 보고 정답 대신 힌트를 주는 LLM 답변을 돌려준다

## 완료 조건
- [ ] `backend/app/ai/chat.py`의 `reply`에서 LLM을 부르고, 요청의 ShapeScene을 맥락으로 넣는다
- [ ] 시스템 프롬프트가 초5~중1 눈높이의 힌트형이고, 정답을 바로 말하지 않는다
- [ ] 질문 예시 3개 이상의 답변을 `docs/reports/`에 기록했다

## 참고
- 관련 문서: `docs/02-specs.md` D. API, `docs/03-product-plan.md` C-4
