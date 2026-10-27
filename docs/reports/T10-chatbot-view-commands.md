# 작업 기록 - 챗봇 화면 조작 명령 (꼭짓점 강조, 접기 값)

- 일시: 2026-10-27 13:55 (KST)
- 작성자: HandoA01
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- `/chat` 응답에 `view`(화면 조작)를 더했다: `{ "reply", "view": { "highlightVertices": [...], "foldPercent": 0~100 | null } | null }`
- 챗봇이 답하면 질문에 나온 꼭짓점이 강조되고(복사본 모두 같은 색, 나머지 흐리게), 접기 슬라이더가 정한 값까지 부드럽게 움직인다
- 예: "ㄱ이랑 만나는 꼭짓점이 어디야?" → "꼭짓점 ㄱ을 전개도에서 색칠해 두었어요…" + ㄱ 강조 + 접기 30%

## 변경 범위
- 계약: 이슈 #16에 형식을 제안하고 `api.md`("/chat 화면 조작")부터 고쳤다
- backend: `chat.py`가 Gemini 구조화 출력(JSON 스키마)으로 `reply`·`view`를 받고, `clean_view`로 없는 꼭짓점은 버리고 접기 %는 0~100으로 자른다. `routes.py`는 `ChatAnswer`를 그대로 돌려준다
- frontend: `api.ts`(`ChatAnswer`·`ChatView` 타입), `ChatPanel`(`onView`), `FoldControls`(`target` prop: 그 값까지 애니메이션), `App`(강조·접기 목표 상태 → `Viewer.highlightVertices`, `FoldControls.target`)
- 검사: `backend/tests/test_chat.py`(LLM 호출 없음). AGENTS.md·README·stack.md·01 문서의 검사 목록에 더했다

## 주요 변경 파일
- `backend/app/ai/chat.py`, `backend/app/api/routes.py`, `backend/tests/test_chat.py`
- `frontend/src/ui/api.ts`, `frontend/src/ui/ChatPanel.tsx`, `frontend/src/ui/FoldControls.tsx`, `frontend/src/ui/App.tsx`
- `docs/specs/api.md`, `docs/specs/stack.md`, `docs/01-folder-architecture.md`, `AGENTS.md`, `README.md`

## 결정
- **힌트형 강조**: 프롬프트에 "질문에 나온 꼭짓점만 강조, 정답 꼭짓점은 절대 넣지 않기", "다 접으면 답이 바로 보이는 질문은 100 대신 30~60"을 넣었다. 실제로 ㄱ 질문에 ㄱ만 강조하고 30%로 접었다
- 접기 값은 뷰어의 펼침 값 `s`가 아니라 **접기 %**(ui.md 슬라이더 방향)로 받는다. LLM에게 "0 = 전개도, 100 = 입체"가 덜 헷갈린다. frontend가 `unfoldOf`로 바꾼다
- 챗봇이 정한 접기는 단계별 모드여도 단계 사이 멈춤 없이 "한 번에" 속도로 움직인다. `FoldControls`의 기존 애니메이션(`play`)을 그대로 쓴다
- 강조는 다음 답이 오면 그 답의 값으로 바뀌고(`view`가 `null`이면 끔), 대화창을 닫으면 끈다
- 응답 형식을 강제하려고 Gemini `response_mime_type: application/json` + `response_json_schema`(Pydantic `ChatAnswer`의 스키마)를 쓴다. 형식이 깨지면 502

## 질문 예시와 응답 (목 데이터 직육면체, 선 없음)

| 질문 | reply (요약) | view |
|---|---|---|
| ㄱ이랑 만나는 꼭짓점이 어디야? | 꼭짓점 ㄱ을 색칠해 두었어요. 반쯤 접어 보면 어떤 꼭짓점이 맞닿는지 찾을 수 있어요 | ㄱ 강조, 접기 30% |
| 모서리 ㄱㄴ이랑 맞닿는 모서리는 뭐야? | 살짝 접어 보고 같은 색 모서리를 보세요 | ㄱ·ㄴ 강조, 접기 30% |
| 다 접으면 어떤 모양이 돼? | 슬라이더로 상자가 만들어지는 걸 관찰해 보세요 | 강조 없음, 접기 50% |
| 이 직육면체 겉넓이가 얼마야? | 똑같은 면이 세 쌍. 앞면·옆면·윗면 넓이를 구해 더해 볼까요? | `null` |
| 오늘 점심 뭐 먹을까? | 공부로 돌아와서 ㄱ과 맞닿는 꼭짓점을 반쯤 접어 찾아볼까요? | ㄱ 강조, 접기 50% |

## 확인
- `python -m tests.test_chat`: 없는 꼭짓점(8, −1)·중복 거르기, 접기 % 0~100 자르기, 키 없을 때 `view: null`
- 헤드리스 크롬(CDP)으로 대화창에 질문 → 답이 오고 4초 뒤 슬라이더 30%, 배지 "접는 중 30%", 꼭짓점 ㄱ만 빨갛게 강조된 것을 화면으로 확인

## 리스크/이슈
- 겉넓이 힌트는 TODO-9 때와 같이 "세 쌍"을 말하면서 "세 개를 더해 볼까요"로 끝나 2배를 빠뜨린 쪽으로 읽힐 수 있다
- 강조된 꼭짓점의 한글 라벨은 3D 화면에 그리지 않는다(TODO-5 결정). 색과 크기로만 알 수 있다
- 모서리 강조(맞닿는 모서리 쌍 고르기)는 `view`에 없다. 필요하면 `highlightEdges`처럼 더한다 (뷰어 props부터)

## 다음 작업
- TODO-15 시연 시나리오에 챗봇 질문 예시(위 표)를 쓸 수 있다

## 참고
- 관련 문서: `docs/specs/api.md` "/chat 화면 조작", 이슈 #16 댓글
