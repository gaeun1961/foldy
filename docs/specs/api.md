# backend API

frontend가 부르는 backend 엔드포인트입니다. 요청·응답의 `ShapeScene`은 [shape-scene.md](shape-scene.md)를 따릅니다.

backend 기본 주소는 `http://localhost:8000`이고, 자동 문서는 `/docs`에서 볼 수 있다.

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/analyze` | multipart `file` (이미지만, 아니면 400) | `ShapeScene` (현재는 목) |
| POST | `/chat` | `{ "message": string, "scene": ShapeScene }` | `{ "reply": string, "view": ChatView \| null }` (아래 "화면 조작"). Gemini가 도형을 보고 힌트를 준다. LLM 호출이 실패하거나 20초를 넘기면 502 `{ "detail": string }`. `LLM_API_KEY`가 없으면 고정 문장, `view`는 `null` |

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
