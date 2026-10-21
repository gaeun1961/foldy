# TODO - 챗봇 연결

- 등록 일시: 2026-10-21 09:16 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 진행 시점: LLM API 키 준비 후 (AI 담당 + UI 담당)

> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학생 질문에 현재 도형을 보고 힌트를 주고, 필요하면 화면을 조작하는 챗봇을 연결한다

## 요구사항
- `backend/app/ai/chat.py`의 `reply`에서 LLM 호출, ShapeScene을 문맥으로 넣는다
- 정답을 바로 알려주지 않고 힌트 위주
- 화면 조작(돌리기, 접기 등)을 하려면 `/chat` 응답 형식 확장을 이슈로 먼저 합의하고 `docs/02-specs.md`부터 고친다
- `frontend/src/ui/` 챗봇 영역에서 `/chat` 호출

## 작업 요약
- 힌트 프롬프트 작성, 응답 형식 합의, UI 연결

## 선행조건
- LLM API 키 발급, 화면 조작은 접기 애니메이션 이후

## 참고
- 관련 문서: `docs/02-specs.md` D. API
- todo-list 한 줄 요약: /chat 에 LLM 연결, 힌트와 화면 조작
