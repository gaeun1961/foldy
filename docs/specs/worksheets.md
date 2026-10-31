# 내 학습지 (보관함 · 팀 테스트용 인식 엔진 · 인식 대기 화면)

[mobile.md](mobile.md) 다음 단계의 계획과 명세입니다. **상태: 계획 (2026-10-31, 구현 전)**. 팀원 작업과 겹치지 않게 경계·변경 지도를 먼저 정한다.

- 결정 (사용자, 2026-10-31)
  - 사진 인식은 API 비용이 커서 **팀 테스트에서는 Antigravity CLI(`agy`)로** 읽는다. 학생이 쓰는 배포 서버에서는 켜지 않는다
  - 찍은 학습지를 다시 볼 수 있게 **보관함**을 둔다. 책의 "차례"(예시 도형)와 따로
- **바꾸지 않는 것**: ShapeScene 계약, `/analyze`·`/chat` 요청·응답, `ViewerProps`, `PhotoUpload`의 Props, **`App.tsx`**(10/28 이후 수정 21건 중 팀원 17건, 겹침이 가장 높다)

---

## A. 작업 나누기

| 가칭 | 작업 | 영역 | 선행 | 크기 |
|---|---|---|---|---|
| W1 | 팀 테스트용 인식 엔진 `agy` | backend `ai/` | 실험 W0 | 반나절 |
| W2 | eval 에서 엔진·모델 고르기 (`--engine agy --model …`) | backend `evals/` | W1 | 반나절 |
| W3 | 내 학습지 보관함 (기기 안 저장, 다시 열기, 지우기) | frontend `ui/` | mobile 브랜치 머지 | 하루 |
| W4 | 인식 대기 화면 (사진 위 "읽는 중", 걸린 시간) | frontend `ui/` | W3 | 반나절 |
| W5 | 사진 돌리기 ↻ 90° (버그 [B2](../todo/B2-photo-overlay-rotated.md) 해결) | frontend `ui/` | 없음 | 반나절 |
| W6 | (인계, 2026-10-31) 학습지 사진을 홀로그램 면에 입혀 접기. 홀로그램 브랜치 `feature/122-hologram-mode`(#122) 머지 뒤. 메모: `git show feature/122-hologram-mode:docs/proposals/hologram/photo-handoff.md`. `stage.ts` 사진 경로 + prop 한 줄로 좁히고 `HologramMode`·`HologramViewer`·`holoLayout`, ShapeScene·ViewerProps는 고치지 않는다 | frontend `viewer/` | #122 머지 | 하루 |

- **W0 결과 (2026-10-31)**: 사진은 프롬프트 앞 `@photo.jpg`로 붙인다(붙이지 않으면 에이전트가 명령으로 열려다 거부된다). 출력은 `{"status","response":"```json …```","usage"}`라 기존 `cli_scene`으로 읽힌다

  | 학습지 | 모델 | 시간 | 결과 |
  |---|---|---|---|
  | 29번 직육면체 선 (십자형 + 선) | flash-medium | 127초 | 구조·라벨·인쇄 선 맞음, 치수는 2·2·1로 단순화 |
  | 3-2 정육면체 숫자 (계단형, 사진 옆으로 누움) | flash-low | 15초 | **전개도 모양 틀림** (접히지만 마주 보는 면이 달라 답이 틀림) |
  | 3-2 | flash-medium | 약 2분 | 계단형·면 글자 맞음, 손글씨 답 무시 |

  → 기본 모델 `gemini-3.8-flash-medium`. 앱은 틀린 전개도도 접히면 알아채지 못하므로 사진과 비교해 보는 화면(W4)이 필요하다
- **W0 (실험, 30분)**: `agy`가 사진 파일을 읽고 ShapeScene JSON 하나를 돌려주는지, 걸리는 시간, 출력 형식을 사진 1~2장으로 확인한다. 사용자 계정 사용량을 쓰므로 사람이 정해서 돌린다. 결과에 따라 C절의 명령을 고친다
- **흐름**: backend(W1→W2)와 frontend(W3→W4)는 폴더가 달라 **동시에** 할 수 있다. 같은 흐름 안은 차례로

## B. 경계

```
[휴대폰/PC 브라우저]                         [backend]
 PhotoUpload ── 사진 ──▶ /analyze ──▶ analyze_image ──┬─ VISION_ENGINE=api (기본, 배포)  → Gemini API
   │  ▲                                               └─ VISION_ENGINE=agy (팀 테스트)  → agy CLI
   │  └── ShapeScene (계약 그대로) ◀──────────────────┘
   └─ 성공하면 보관함(IndexedDB, 이 기기 안)에 저장 → 다시 열면 /analyze 없이 바로 3D
```

- backend 엔진이 바뀌어도 frontend는 모른다 (응답은 같은 ShapeScene, 에러도 [api.md](api.md) 표 그대로)
- 보관함 데이터(`SavedWorksheet`)는 `ui/` 안에서만 쓴다. `shared/`에 넣지 않으므로 계약 변경 절차가 필요 없다

---

## C. W1: 팀 테스트용 인식 엔진 `agy`

- `backend/.env`
  - `VISION_ENGINE=agy`: `/analyze`가 Gemini API를 부르지 않고 이 컴퓨터에 로그인된 Antigravity CLI로 읽는다. 비우거나 `api`면 지금과 같다
  - `VISION_AGY_MODEL=`: 비우면 `gemini-3.8-flash-medium` (`agy models`로 목록. 2026-10-31 기준 Gemini 4 Argon·3.8 Flash 등)
  - 기존 `VISION_CLI=1`(API 실패 시 Gemini CLI 비상 경로)은 그대로 둔다
- `backend/app/ai/vision.py`
  - `recognize_agy(image, content_type) -> ShapeScene`: 기존 `recognize_cli`와 같은 모양. 사진을 임시 폴더에 두고 그 폴더에서 실행
    ```
    agy -p "<사진 파일 이름> 을 읽고 지시대로 JSON 하나만" --output-format json --model <모델> --sandbox --add-dir <임시 폴더> --print-timeout 120s
    ```
    프롬프트(`VISION_PROMPT`)를 넘기는 방법(stdin 또는 파일), 출력 JSON 모양, 사진 읽기에 권한 확인이 뜨는지는 **W0에서 확인해 적는다**
  - 결과는 지금처럼 `ShapeScene.model_validate`로 검증하고, 실패는 `VisionError`(422·503 표 그대로)
  - **한 번에 하나만** 실행한다 (`threading.Lock`). 팀원 여러 명이 동시에 올리면 차례로
  - `analyze_image`: `VISION_ENGINE`이 `agy`면 `recognize_agy`, 아니면 지금 흐름. 같은 사진 기억(해시)은 엔진과 상관없이 쓴다
- **안전**
  - `--dangerously-skip-permissions`를 쓰지 않는다. `--sandbox`로 실행하고 작업 폴더는 사진만 든 임시 폴더
  - 학습지 글이 에이전트에게 지시하는 문장이어도 결과는 ShapeScene 검증을 통과해야만 쓴다
  - 서버 로그에 "팀 테스트 엔진(agy)"을 남긴다. 배포 서버 `.env`에는 넣지 않는다 (개인 계정 사용량)
- 검사: `tests/test_analyze.py`에 엔진 고르기(환경 변수 → 부르는 함수), `agy` 출력 → ShapeScene 파싱을 LLM 없이 (subprocess 가짜)
- 문서: [api.md](api.md) "/analyze 에러" 아래에 엔진 한 단락, [stack.md](stack.md) LLM 항목, `.env.example`, README "팀 테스트"

## D. W2: eval 엔진·모델 고르기

- `python -m evals.vision_eval --engine agy --model gemini-4-argon-medium` 처럼 엔진과 모델을 고른다. 기본은 지금(API)
- 목적: API 비용 없이 모델별 정확도·시간을 비교해, 배포 때 쓸 모델을 고른다. 1600px로 줄인 사진([mobile.md](mobile.md) M2)도 같이 잰다
- 결과는 `evals/results/`(git 제외)에 두고 숫자만 리포트로 옮긴다

## E. W3: 내 학습지 보관함

**저장**: 이 기기 브라우저의 IndexedDB. 서버로 보내지 않는다 (로그인 없음, 학생 사진이 밖으로 나가지 않음). [03](../03-product-plan.md) 제외 범위 "학습 기록 저장"은 서버 저장을 뜻하는 것으로 고쳐 적는다

- 새 파일 `ui/worksheetStore.ts` (React 없음)
  ```ts
  export interface SavedWorksheet {
    id: string            // crypto.randomUUID()
    savedAt: number       // Date.now()
    name: string          // 기본: 도형 이름 + 날짜 (예: "직육면체 · 10/31 14:20"), 바꿀 수 있음
    photo: Blob           // 기준 사진 (줄이고·편 사진, mobile.md M2·M3)
    thumb: Blob           // 긴 변 240px JPEG (목록용)
    scene: ShapeScene     // /analyze 결과 그대로
    place: PhotoPlace | null // 네모로 읽었으면 그 네모
  }
  export function listWorksheets(): Promise<Omit<SavedWorksheet, 'photo'>[]> // 최신 순
  export function getWorksheet(id: string): Promise<SavedWorksheet | null>
  export function saveWorksheet(w: Omit<SavedWorksheet, 'id' | 'savedAt'>): Promise<string>
  export function renameWorksheet(id: string, name: string): Promise<void>
  export function deleteWorksheet(id: string): Promise<void>
  ```
  - DB 이름 `foldy`, 저장소 `worksheets`, 버전 1. 최대 **30개**, 넘으면 가장 오래된 것부터 지운다 (사진 30장 ≈ 10MB)
  - IndexedDB를 못 쓰면(사생활 보호 모드 등) 함수들이 빈 목록·무시로 끝나고 화면에서 보관함을 숨긴다
- 새 파일 `ui/WorksheetShelf.tsx`: `PhotoUpload` 안, 올리기 버튼 아래 접히는 칸 "내 학습지 (n)". 썸네일 + 이름 + 날짜, 누르면 열기, 길게 누르거나 ⋯로 이름 바꾸기·지우기 (지우기는 한 번 더 묻는다)
- `PhotoUpload.tsx`
  - `read()` 성공 직후 `saveWorksheet` (기준 사진, 썸네일, scene, place)
  - 다시 열기 = 사진 인식이 성공했을 때와 **같은 길**: `setBase`처럼 사진을 기준 사진으로 두고 `onPhoto(url)` → `onScene(scene, place)`. 그래서 `App.tsx`는 바뀌지 않는다
- 화면 규칙은 [ui.md](ui.md) 화면 배치 2번(사진 업로드)에 먼저 적는다
- 검사: `worksheetStore`는 브라우저 API라 `npm test` 대신 이름 만들기·30개 넘을 때 지울 목록 고르기 같은 순수 함수만 `worksheetStore.test.ts`로. 저장·열기는 브라우저에서 확인

## F. W4: 인식 대기 화면

- `PhotoUpload`의 `loading` 동안 사진 위에 옅은 막 + 위에서 아래로 지나가는 선(읽는 중 느낌) + "사진에서 도형을 찾고 있어요… 12초"(지난 초)
- `agy` 엔진은 느릴 수 있어(W0에서 잼) 30초가 넘으면 "조금 더 걸려요. 그동안 아래에서 직접 그려 봐도 돼요"
- `index.css`는 사진 업로드 블록 바로 아래에 더한다. 움직임은 `prefers-reduced-motion`이면 끈다

---

## G. 변경 지도

| 파일 | W1 | W2 | W3 | W4 | 팀원 작업과 겹침 (10/28 이후 커밋 수) |
|---|---|---|---|---|---|
| `backend/app/ai/vision.py` | M | | | | 낮음 |
| `backend/tests/test_analyze.py` | M | | | | 낮음 |
| `backend/evals/vision_eval.py` | | M | | | 낮음 |
| `backend/.env.example`, `README.md` | M | | | | 낮음 |
| `docs/specs/api.md`, `stack.md` | M | | | | 낮음 |
| `frontend/src/ui/worksheetStore.ts` (+ `.test.ts`) | | | N | | 없음 |
| `frontend/src/ui/WorksheetShelf.tsx` | | | N | | 없음 |
| `frontend/src/ui/PhotoUpload.tsx` | | | M | M | 중간 (6) — mobile 브랜치가 먼저 머지돼야 한다 |
| `frontend/src/index.css` | | | M | M | **높음 (17)** — 사진 업로드 블록 아래에만 더한다 |
| `frontend/package.json` (`test` 줄) | | | M | | 중간 — 끝에만 붙인다 |
| `docs/specs/ui.md` (화면 배치 2번) | | | M | M | **높음** — 2번 칸만 |
| `docs/03-product-plan.md` (제외 범위 한 줄) | | | M | | 낮음 |
| `docs/01-folder-architecture.md` (`ui/` 칸) | | | M | | 중간 — 이름만 끝에 |
| `frontend/src/ui/App.tsx`, `viewer/` | | | | | **고치지 않는다** |

합칠 때 규칙은 [mobile.md](mobile.md) I절과 같다. 추가로:
- W3·W4는 mobile 브랜치(`feature/mobile-web`)가 main에 머지된 뒤 새 브랜치로 시작한다 (`PhotoUpload.tsx`를 같이 고치므로)
- W1은 main에서 바로 시작해도 된다 (frontend를 건드리지 않음)
- PR 전 확인: AGENTS.md "검증" 명령 + `VISION_ENGINE` 없이 지금과 똑같이 동작하는지 + (W3) 보관함에서 연 학습지가 처음 인식했을 때와 같은 3D·사진 위치인지
