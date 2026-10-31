# backend API

frontend가 부르는 backend 엔드포인트입니다. 요청·응답의 `ShapeScene`은 [shape-scene.md](shape-scene.md)를 따릅니다.

backend 기본 주소는 `http://localhost:8000`이고(휴대폰에서 열 때는 frontend `.env`의 `VITE_API_URL`, [mobile.md](mobile.md)), 자동 문서는 `/docs`에서 볼 수 있다.

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/analyze` | multipart `file` (이미지만, 아니면 400), 선택 `problem` (문제 칸 사진, 아래 "문제 칸") | `ShapeScene`. Gemini가 학습지 사진을 읽는다(프롬프트 `vision_prompt.py`). 실패하면 422·503 `{ "detail": string }` (아래 "/analyze 에러") |
| POST | `/chat` | `{ "message": string, "scene": ShapeScene }` | `{ "reply": string, "view": ChatView \| null }` (아래 "화면 조작"). Gemini가 도형을 보고 힌트를 준다. LLM 호출이 실패하거나 20초를 넘기면 502 `{ "detail": string }`. `LLM_API_KEY`가 없으면 고정 문장, `view`는 `null` |

## `/analyze` 에러

실패하면 목 데이터를 돌려주지 않고 에러를 돌려준다. frontend는 `detail`을 그대로 보여주고, 아래 수동 입력(전개도 직접 만들기, TODO-12)으로 안내한다.

| 상태 | 언제 | `detail` (학생에게 그대로 보임) |
|---|---|---|
| 400 | 이미지 파일이 아님 | "이미지 파일만 올릴 수 있어요" |
| 422 | 사진에서 직육면체·정육면체를 읽지 못함 (Gemini 답이 ShapeScene이 아님) | "사진에서 도형을 찾지 못했어요" |
| 503 | 사진 인식을 지금 쓸 수 없음: 키 없음, 하루 사용 한도 초과(429), 모델 과부하(503), 60초 넘김 | "지금은 사진 인식을 쓸 수 없어요" |

- 모델이 붐비면(503) 2초 쉬고 한 번 더 부른다
- **Gemini CLI 비상 경로** (`.env`의 `VISION_CLI=1`일 때만): API로 인식을 못 쓰면(503 경우 전부) 그 컴퓨터에 로그인된 Gemini CLI(`gemini`)로 같은 프롬프트를 한 번 더 보낸다. CLI도 실패하면 위 표대로 503이다. 시연 노트북용이고, CLI 무료 사용량은 개인 개발용이라 배포에서는 켜지 않는다
- **팀 테스트 엔진** (`.env`의 `VISION_ENGINE=agy`일 때만): Gemini API를 부르지 않고 그 컴퓨터에 로그인된 Antigravity CLI(`agy`, 모델 `VISION_AGY_MODEL`, 기본 `gemini-4-argon-low`)로 읽는다. 잘라낸 도형 한 장에 15~20초, 도형은 셋까지 동시에 처리한다(미리 띄워 두고 늦으면 하나 더, worksheets.md C). 응답·에러는 위 표 그대로. 팀원끼리 시험할 때만 쓰고 배포에서는 켜지 않는다 ([worksheets.md](worksheets.md) W1)
- **문제 칸** (`problem`, 선택, [worksheets.md](worksheets.md) 2단계 네모): 학생이 문제 전체를 감싼 사진. 오면 도형(`file`)과 **동시에** 인쇄된 문제 문장만 읽어 응답 `problem`을 그것으로 채운다(agy: `gemini-3.8-flash-low`, API: `gemini-3.5-flash-lite`). 문장을 못 읽어도 실패로 보지 않고 도형 결과를 그대로 돌려준다
- **같은 사진은 다시 부르지 않는다**: 사진 바이트의 해시로 성공한 결과를 backend가 켜져 있는 동안 기억한다(최근 100장). 무료 한도(모델당 하루 20번)를 아끼려고. 실패는 기억하지 않는다
- 서버 로그에는 원인(429, 시간 초과 등)을 남긴다

## `/chat` 화면 조작 (`view`)

챗봇이 힌트와 함께 화면을 바꿔 보여준다 (TODO-10, 이슈 #16). 바꿀 필요가 없으면 `view`는 `null`이다.

```json
{
  "reply": "꼭짓점 ㄱ을 보세요. 반쯤 접으면 어디로 갈까요?",
  "view": { "highlightVertices": [0], "foldPercent": 50 }
}
```

- `highlightVertices: number[]`: 강조할 꼭짓점 인덱스. 뷰어의 `ViewerProps.highlightVertices`에 그대로 넣는다 ([viewer.md](viewer.md)). 빈 배열이면 강조를 끈다. **질문에 나온 꼭짓점만** 강조하고 정답이 되는 꼭짓점은 강조하지 않는다 (힌트형)
- `foldPercent: number | null`: 접기 % (0 = 전개도, 100 = 다 접힘, [ui.md](ui.md) 접기 슬라이더와 같은 방향). `null`이면 그대로 둔다. frontend는 지금 위치에서 그 값까지 부드럽게 움직인다
- 도형에 없는 꼭짓점 인덱스는 backend가 버리고, `foldPercent`는 0~100으로 자른다
- frontend: 강조는 다음 답이 올 때 그 답의 값으로 바뀌고, 대화창을 닫으면 꺼진다
