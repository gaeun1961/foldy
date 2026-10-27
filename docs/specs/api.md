# backend API

frontend가 부르는 backend 엔드포인트입니다. 요청·응답의 `ShapeScene`은 [shape-scene.md](shape-scene.md)를 따릅니다.

backend 기본 주소는 `http://localhost:8000`이고, 자동 문서는 `/docs`에서 볼 수 있다.

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/analyze` | multipart `file` (이미지만, 아니면 400) | `ShapeScene` (현재는 목) |
| POST | `/chat` | `{ "message": string, "scene": ShapeScene }` | `{ "reply": string }`. Gemini가 도형을 보고 힌트를 준다. LLM 호출이 실패하거나 20초를 넘기면 502 `{ "detail": string }`. `LLM_API_KEY`가 없으면 고정 문장 |
