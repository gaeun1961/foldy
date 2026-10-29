# 작업 기록 - 사진 인식 비상 경로 (Gemini CLI)

- 일시: 2026-10-29 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가 / 결정

## 요약
- API 무료 한도(모델당 하루 20번, 429)와 과부하(503)로 사진 인식이 자주 막혔다. 과부하 재시도까지 한도에 들어가서, 10/29 저녁에는 사진 몇 장 재고 나서 한도가 바로 떨어졌다
- `.env`에 `VISION_CLI=1`을 넣으면, API로 인식을 못 쓸 때 그 컴퓨터에 로그인된 Gemini CLI(`gemini`)로 같은 프롬프트를 한 번 더 보낸다. 기본은 꺼져 있다

## 결정
- 유료 결제 대신 시연 노트북에서만 쓰는 비상 경로로 둔다. CLI 무료 사용량은 개인 개발용이라 배포에서는 켜지 않는다
- 한도를 넘기려고 API 키를 여러 개 돌려 쓰는 것은 약관 문제가 있어 하지 않는다
- Antigravity는 코딩용 편집기라 다른 프로그램이 부를 수 없어서 Gemini CLI를 쓴다

## 변경 범위
- `backend/app/ai/vision.py`: `recognize_cli`(사진을 임시 폴더에 두고 `gemini -p "@photo.jpg ..." --output-format json`, 프롬프트는 stdin), `cli_scene`(출력 → ShapeScene, ```json 감싸기 허용), `analyze_image`가 API 실패(503 경우) + `VISION_CLI=1`일 때만 CLI로
- `tests/test_analyze.py`: 꺼져 있으면 안 부름, 켜면 429 때 CLI로, 422(못 읽은 사진)는 CLI로 안 넘김, CLI 출력 읽기
- `docs/specs/api.md` "/analyze 에러", `docs/specs/stack.md` LLM, `backend/.env.example`

## 리스크/이슈
- **실제 CLI로는 아직 못 돌려 봤다** (이 컴퓨터에 설치돼 있지 않음). 검사는 CLI 부르는 부분을 가짜로 바꿔서 했다. 설치·로그인 후 사진 한 장으로 확인해야 한다
- CLI는 띄우는 시간까지 들어서 API보다 느리다 (시간 제한 120초)
- 프롬프트를 stdin으로 넘기면 CLI가 `-p` 문장과 합쳐 읽는다고 보고 만들었다. 실제로 안 합쳐지면 프롬프트를 파일로 두고 `@파일`로 넘기는 방식으로 바꾼다

## 다음 작업
- `npm install -g @google/gemini-cli` → `gemini` 한 번 실행해 Google 계정으로 로그인 → `.env`에 `VISION_CLI=1` → backend 다시 켜고 사진 올려 보기
