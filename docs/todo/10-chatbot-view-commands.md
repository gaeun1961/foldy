# TODO - 챗봇이 화면 조작 명령을 함께 반환 (하이라이트, 슬라이더 값)

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: AI
- 담당자:
- 선행 TODO: #3 `03-fold-animation-slider.md`, #5 `05-vertex-highlight.md`, #9 `09-chatbot-basic.md`

> 시작 전에 `docs/todo/00-todo-list.md`와 이 파일의 담당자 칸에 이름을 적습니다.
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 챗봇 답변과 함께 꼭짓점 하이라이트, 접기 슬라이더 값 같은 화면 조작 명령을 돌려주고 화면에 반영한다

## 완료 조건
- [ ] `/chat` 응답 형식 확장을 이슈로 합의하고 `docs/02-specs.md` D부터 고쳤다
- [ ] 예: "ㄱ이랑 만나는 꼭짓점이 어디야?" → 답변 + 해당 꼭짓점 하이라이트 + 슬라이더 값이 함께 온다
- [ ] frontend가 명령을 받아 뷰어에 반영한다

## 참고
- 관련 문서: `docs/02-specs.md` D. API
