# 2) Specs

이 문서는 foldy의 기술 스택, 구현 규칙, 공용 데이터 계약(ShapeScene)과 API를 정의합니다.

---

## A. Runtime / Core

### frontend (`frontend/`)
- **프레임워크**: React 19
- **언어**: TypeScript 6 (strict)
- **빌드 툴**: Vite 8
- **3D**: three.js (0.186, `OrbitControls`로 회전). TODO-1에서 GeoGebra와 비교한 뒤 플랜 B(three.js 직접 구현)로 결정 ([리포트](reports/261021-1135-01-geogebra-line-check.md))
- **린트**: oxlint (`npm run lint`)
- **스타일링**: 일반 CSS (`src/index.css`), UI 라이브러리 없음
- **패키지 매니저**: npm

### backend (`backend/`)
- **언어**: Python 3.13
- **프레임워크**: FastAPI + uvicorn, 데이터 검증은 Pydantic v2
- **업로드**: python-multipart
- **린트/포맷**: ruff (`ruff check .`, `ruff format .`)
- **환경 변수**: `backend/.env` (`uvicorn --env-file .env`로 읽음), 커밋은 `.env.example`만

---

## B. 구현 규칙

- **LLM 호출은 전부 backend에서** 한다. API 키(`LLM_API_KEY`)가 브라우저에 노출되면 안 되므로 frontend에서 LLM을 직접 호출하지 않는다
- 비전 LLM은 사진을 ShapeScene JSON으로 바꾸고, 결과는 `ShapeScene.model_validate`로 검증한다. 인식에 실패하면 사용자가 도형·치수를 직접 입력하는 **수동 경로**가 반드시 있어야 한다
- 비전 LLM 연결 위치는 `backend/app/ai/vision.py`의 `analyze_image`, 챗봇 연결 위치는 `backend/app/ai/chat.py`의 `reply`다. `backend/app/api/`의 라우터는 이 함수들을 부르기만 한다
- **뷰어는 인터페이스 뒤에 숨긴다**. UI는 `frontend/src/viewer/index.ts`의 `Viewer`와 `ViewerProps`만 사용하고, 구현을 바꿀 때는 이 파일의 export 한 줄만 교체한다
- AI 기능이 붙기 전에는 목 데이터를 쓴다. frontend는 `frontend/src/shared/mock.ts`, backend는 `backend/app/ai/vision.py`의 `MOCK_SCENE`이며, 둘은 같은 내용을 유지한다
- CORS는 Vite 개발 서버(`http://localhost:5173`, `http://127.0.0.1:5173`)만 허용한다

### three.js 뷰어 규칙

TODO-1의 GeoGebra 실험(`frontend/lab/geogebra.ts`, 서비스에 쓰지 않음)에서 확인한 배치·동작을 three.js로 직접 구현한다.

- **좌표**: three.js는 y가 위다. 도형 중심이 원점이고 x = 가로(`width`), y = 높이(`height`), z = 깊이(`depth`, 앞면이 +z 쪽)다. C의 꼭짓점 규칙과 같은 위치다
- **면 6개 계층 구조**: 직육면체를 하나의 상자가 아니라 면 6개로 만들고, `cross` 배치 기준으로 부모-자식 관계를 둔다. 각 면은 부모와 맞닿은 **접히는 모서리를 회전축**으로 둔다 (축 위치에 pivot `Group`을 두고 면 메시를 그 안에 배치)

  | 면 (꼭짓점) | 부모 | 회전축 모서리 |
  |---|---|---|
  | 앞면 (0-1-5-4) | 없음 (고정) | - |
  | 왼쪽 (0-3-7-4) | 앞면 | 0-4 |
  | 오른쪽 (1-2-6-5) | 앞면 | 1-5 |
  | 윗면 (4-5-6-7) | 앞면 | 4-5 |
  | 아랫면 (0-1-2-3) | 앞면 | 0-1 |
  | 뒷면 (3-2-6-7) | 오른쪽 | 2-6 |

- **펼침 값 `s`**: 0 = 직육면체(접힘), 1 = 전개도(펼침). 각 면의 회전각은 `s × 90°`로 `s`에 비례한다. `s = 1`이면 모든 면이 앞면과 같은 평면에 놓여 C의 `cross` 모양이 된다
- **선분**: 선분은 그 선분이 놓인 면 메시의 **자식**으로 붙인다. 끝점은 면 기준 좌표로 계산한다 (`{ vertex }` → 그 꼭짓점, `{ edge: [i, j], t }` → i에서 j 쪽으로 t만큼). 그러면 면이 접힐 때 선이 자동으로 따라온다. 원래 직육면체 좌표로 그린 선은 따라오지 않는다
- **두 면에 걸친 선**: ShapeScene에서 면별 선분으로 나눠서 표현한다 (계약 그대로). 펼치면 잘린 모서리에서 끊어지는 게 맞다. 두 끝점이 같은 면 위에 없는 선분은 그리지 않고 콘솔에 경고한다
- **꼭짓점 복사본**: 각 면은 자기 꼭짓점 4개(위 표)의 표시점을 자식으로 가진다. 전개도에서 꼭짓점의 복사본은 `(면, 꼭짓점 인덱스)` 쌍이다. 펼치면 한 꼭짓점이 최대 3곳으로 나뉜다. 라벨·색·하이라이트는 "꼭짓점 인덱스가 같은 복사본 모두"에 적용한다
- **클릭**: `Raycaster`로 꼭짓점 표시점과 모서리 중점 표시점을 맞힌다. 결과는 `(면, { vertex })` 또는 `(면, { edge, t: 0.5 })`이고, 선 긋기에서 같은 면인지는 이 면 정보로 판단한다
- **라이브러리 독립**: `ViewerProps`와 ShapeScene에는 three.js 타입(Mesh, Vector3 등)을 넣지 않는다. 숫자·꼭짓점 인덱스 같은 일반 데이터만 쓴다. 렌더링 라이브러리를 바꿔도 UI와 AI 쪽은 그대로 동작해야 한다

---

## C. ShapeScene 데이터 계약

AI(사진 인식)는 ShapeScene JSON을 **만들고**, 뷰어·UI는 그것을 **그리기만** 한다.
이 형식만 지키면 서로를 기다리지 않고 작업할 수 있다.

- TypeScript: [frontend/src/shared/types.ts](../frontend/src/shared/types.ts)
- Python(Pydantic): [backend/app/ai/schema.py](../backend/app/ai/schema.py)
- 두 파일은 항상 같은 구조여야 한다. **변경은 GitHub 이슈로 먼저 합의하고, 이 문서부터 고친 뒤** 두 파일과 목 데이터를 같은 PR에서 함께 고친다.

### 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `shape` | `"cuboid"` \| `"cube"` | 직육면체 / 정육면체 (1차 범위) |
| `size` | `{ width, depth, height }` | 가로(x) · 깊이(z) · 높이(y), 모두 0보다 큼. 단위는 학습지 그대로(cm 등) |
| `vertexLabels` | `(string \| null)[8]` | 꼭짓점 8개의 라벨. 라벨이 없으면 `null` |
| `lines` | `{ from, to }[]` | 면 위에 그어진 선분. 두 끝점은 같은 면 위 |
| `net` | `{ layout: "cross" }` | 전개도 배치. 1차는 십자형 하나 |

### 꼭짓점 인덱스 규칙

도형 중심이 원점, 앞쪽 = 보는 사람 쪽.

```
      7 ------- 6        아랫면: 0 앞왼쪽, 1 앞오른쪽, 2 뒤오른쪽, 3 뒤왼쪽
     /|        /|        윗면:   4~7 은 각각 0~3 바로 위
    4 ------- 5 |
    | 3 ------|- 2
    |/        |/
    0 ------- 1
```

면으로 보면: 앞면 0-1-5-4, 뒷면 3-2-6-7, 윗면 4-5-6-7, 아랫면 0-1-2-3, 왼쪽 0-3-7-4, 오른쪽 1-2-6-5.

### 선분 끝점

둘 중 하나:

- `{ "vertex": 5 }`: 꼭짓점 5
- `{ "edge": [4, 5], "t": 0.5 }`: 모서리 4→5 위의 점. `t`는 `edge[0]`에서 `edge[1]` 쪽으로 간 비율(0~1). 0.5면 중점

### 전개도 `cross`

```
        [윗면]
[왼쪽] [앞면] [오른쪽] [뒷면]
        [아랫면]
```

### 예시

직육면체 4×2×3에 앞면 대각선 하나와 윗면 가운데를 가로지르는 선 하나가 있는 경우
([frontend/src/shared/mock.ts](../frontend/src/shared/mock.ts)와 같은 내용이며, 지금 `/analyze`가 이 값을 돌려준다):

```json
{
  "shape": "cuboid",
  "size": { "width": 4, "depth": 2, "height": 3 },
  "vertexLabels": ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"],
  "lines": [
    { "from": { "vertex": 0 }, "to": { "vertex": 5 } },
    { "from": { "edge": [4, 5], "t": 0.5 }, "to": { "edge": [6, 7], "t": 0.5 } }
  ],
  "net": { "layout": "cross" }
}
```

---

## D. API

backend 기본 주소는 `http://localhost:8000`이고, 자동 문서는 `/docs`에서 볼 수 있다.

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/analyze` | multipart `file` (이미지만, 아니면 400) | `ShapeScene` (현재는 목) |
| POST | `/chat` | `{ "message": string, "scene": ShapeScene }` | `{ "reply": string }` (현재는 고정 문자열) |
