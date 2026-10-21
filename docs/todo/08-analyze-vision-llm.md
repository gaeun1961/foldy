# TODO - /analyze에 비전 LLM 연결, 실패 시 에러 응답

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: AI
- 이슈: [#14](https://github.com/gaeun1961/foldy/issues/14) (작업 전 assignee 지정)
- 선행 TODO: TODO-7 `07-vision-prompt-test.md` ([#13](https://github.com/gaeun1961/foldy/issues/13))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- `POST /analyze`가 목 대신 비전 LLM 결과를 돌려주고, 실패하면 frontend가 수동 입력으로 넘어갈 수 있는 에러를 돌려준다

## 완료 조건
- [ ] `backend/app/ai/vision.py`의 `analyze_image`에서 LLM을 부르고(키는 `LLM_API_KEY`), 결과를 `ShapeScene.model_validate`로 검증한다
- [ ] 인식·검증 실패, 키 없음일 때 정해진 형식의 에러 응답을 돌려준다. 에러 형식은 `docs/specs/api.md`에 먼저 적는다
- [ ] `MOCK_SCENE`은 테스트용으로만 남기거나 지우고, `docs/specs/stack.md`의 목 데이터 문구를 맞춘다

## 참고
- 관련 문서: `docs/specs/stack.md`, `docs/specs/api.md`
