# TODO - /analyze에 비전 LLM 연결, 실패 시 에러 응답

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: AI
- 담당자:
- 선행 TODO: #7 `07-vision-prompt-test.md`

> 시작 전에 `docs/todo/00-todo-list.md`와 이 파일의 담당자 칸에 이름을 적습니다.
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- `POST /analyze`가 목 대신 비전 LLM 결과를 돌려주고, 실패하면 frontend가 수동 입력으로 넘어갈 수 있는 에러를 돌려준다

## 완료 조건
- [ ] `backend/app/ai/vision.py`의 `analyze_image`에서 LLM을 부르고(키는 `LLM_API_KEY`), 결과를 `ShapeScene.model_validate`로 검증한다
- [ ] 인식·검증 실패, 키 없음일 때 정해진 형식의 에러 응답을 돌려준다. 에러 형식은 `docs/02-specs.md` D에 먼저 적는다
- [ ] `MOCK_SCENE`은 테스트용으로만 남기거나 지우고, 02-specs의 목 데이터 문구를 맞춘다

## 참고
- 관련 문서: `docs/02-specs.md` B, D
