# ShapeScene 데이터 계약

AI(사진 인식)는 ShapeScene JSON을 **만들고**, 뷰어·UI는 그것을 **그리기만** 한다.
이 형식만 지키면 서로를 기다리지 않고 작업할 수 있다.

- TypeScript: [frontend/src/shared/types.ts](../frontend/src/shared/types.ts)
- Python(Pydantic): [backend/app/ai/schema.py](../backend/app/ai/schema.py)
- 두 파일은 항상 같은 구조여야 한다. **변경은 GitHub 이슈로 먼저 합의**한 뒤 두 파일을 같은 PR에서 함께 고친다.

## 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `shape` | `"cuboid"` \| `"cube"` | 직육면체 / 정육면체 (1차 범위) |
| `size` | `{ width, depth, height }` | 가로(x) · 깊이(z) · 높이(y), 모두 0보다 큼. 단위는 학습지 그대로(cm 등) |
| `vertexLabels` | `(string \| null)[8]` | 꼭짓점 8개의 라벨. 라벨이 없으면 `null` |
| `lines` | `{ from, to }[]` | 면 위에 그어진 선분. 두 끝점은 같은 면 위 |
| `net` | `{ layout: "cross" }` | 전개도 배치. 1차는 십자형 하나 |

## 꼭짓점 인덱스 규칙

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

## 선분 끝점

둘 중 하나:

- `{ "vertex": 5 }` — 꼭짓점 5
- `{ "edge": [4, 5], "t": 0.5 }` — 모서리 4→5 위의 점. `t`는 `edge[0]`에서 `edge[1]` 쪽으로 간 비율(0~1). 0.5면 중점

## 전개도 `cross`

```
        [윗면]
[왼쪽] [앞면] [오른쪽] [뒷면]
        [아랫면]
```

## 예시

직육면체 4×2×3, 앞면 대각선 하나 + 윗면 가운데를 가로지르는 선 하나
([frontend/src/shared/mock.ts](../frontend/src/shared/mock.ts)와 같은 내용, `/analyze`가 지금 이 값을 돌려준다):

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

## API

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/analyze` | multipart `file` (이미지) | `ShapeScene` |
| POST | `/chat` | `{ "message": string, "scene": ShapeScene }` | `{ "reply": string }` |
