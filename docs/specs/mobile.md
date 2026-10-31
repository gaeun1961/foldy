# 모바일 웹 (휴대폰으로 학습지 찍어 쓰기)

학생이 휴대폰 브라우저로 foldy를 열고 학습지를 찍어 바로 쓰게 하는 작업의 계획과 명세입니다. **상태: 계획 (시기 미정, 이슈·TODO 파일 없음)**. 시기가 정해지면 `03-product-plan.md` 범위부터 고치고, 아래 B의 TODO를 이슈로 만든다.

- 결정 (2026-10-31, 사용자): 네이티브 앱(Flutter·Capacitor)으로 바꾸지 않고 **모바일 웹에서 사진 찍기를 최적화**한다. 3D 뷰어를 다시 만드는 비용이 크기 때문이다. 근거는 [reports/T00-mobile-ideas.md](../reports/T00-mobile-ideas.md)
- 사진 인식은 지금처럼 Gemini 비전(`/analyze`)이 한다. OCR은 넣지 않는다 (전개도 구조를 못 읽음. 보조 힌트로 쓸지는 eval로 재 본 뒤 따로 정한다)
- **바꾸지 않는 것**: ShapeScene 계약, `/analyze`·`/chat` 요청·응답, `ViewerProps`, `PhotoUpload`의 Props(`onScene`, `onPhoto`). 그래서 backend 검사와 `App.tsx`는 영향을 받지 않아야 한다

---

## A. 지금 상태 (2026-10-31)

| 항목 | 지금 | 문제 |
|---|---|---|
| backend 주소 | `ui/api.ts`의 `API_URL = 'http://localhost:8000'` 고정 | 휴대폰은 자기 자신에게 요청한다 |
| CORS | `backend/app/main.py`가 `localhost:5173`, `127.0.0.1:5173`만 허용 | 휴대폰에서 연 주소는 거부된다 |
| 촬영 | `input[type=file] accept="image/*"` (카메라·앨범) | 동작함. 촬영 안내가 없다 |
| 사진 크기 | 원본 그대로 올림 (휴대폰 3~12MB) | 느리고 데이터를 많이 쓴다 |
| 기울기·원근 | 보정 없음. 네모로 감싸 자르기만 있음 | 비스듬한 사진은 인식이 떨어질 수 있다 |
| 좁은 화면 (390×844) | 3D 50% 위 고정 + 패널 스크롤 | 챗봇 아이콘이 패널 버튼을 가림, 다 접은 도형이 작음, 안내 문구 두 줄 |

## B. 작업 나누기 (TODO 후보)

번호는 이슈를 만들 때 정한다. 아래는 가칭이다.

| 가칭 | 작업 | 선행 | 크기 |
|---|---|---|---|
| M1 | 휴대폰에서 backend 접속 (주소·CORS 설정화, LAN 시연 방법) | 없음 | 반나절 |
| M2 | 사진 줄이기·방향 맞추기 | M1 (휴대폰 확인용) | 반나절 |
| M3 | 원근 보정 (네 귀퉁이 맞춰 종이 펴기) | M2 | 하루 |
| M4 | 촬영 안내 화면 (카메라 미리보기 + 종이 틀) | M1, M2, HTTPS 배포 | 하루 |
| M5 | 휴대폰 화면 다듬기 | 없음 | 반나절 |

순서: **M1 → M2 → M3 → M4**는 차례로(같은 `PhotoUpload.tsx`를 고침), M5는 따로 해도 된다.

---

## C. M1: 휴대폰에서 backend 접속

**frontend**
- `ui/api.ts`: `export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'`. 이름과 export는 그대로 둔다 (다른 파일이 `API_URL`을 쓴다)
- `frontend/.env.example` 새로 만듦: `VITE_API_URL=` 한 줄과 설명. 실제 값은 `frontend/.env` (루트 `.gitignore`의 `.env`가 막는다. `.env.local`은 막지 않으니 쓰지 않는다)
- `tsconfig.app.json`에 이미 `"types": ["vite/client"]`가 있어 `import.meta.env` 타입은 따로 안 만든다

**backend**
- `app/main.py`: `allow_origins`를 환경 변수 `CORS_ORIGINS`(쉼표로 구분)에서 읽는다. 비어 있으면 지금 값(`http://localhost:5173`, `http://127.0.0.1:5173`) 그대로
- `backend/.env.example`에 `CORS_ORIGINS=` 한 줄과 설명

**LAN 시연 (같은 와이파이)**
```sh
# PC IP가 172.16.0.10 이라면
cd backend  && uvicorn app.main:app --host 0.0.0.0 --env-file .env   # .env: CORS_ORIGINS=http://172.16.0.10:5173
cd frontend && npm run dev -- --host                                 # .env: VITE_API_URL=http://172.16.0.10:8000
# 휴대폰에서 http://172.16.0.10:5173
```
- Windows 방화벽에서 5173·8000 포트 허용이 필요할 수 있다
- HTTP라서 `getUserMedia`(M4)는 안 된다. `input[type=file]` 촬영은 된다

**문서**: `specs/api.md` 기본 주소 문장, `specs/stack.md` CORS·환경 변수, `README.md` 실행 방법

## D. M2: 사진 줄이기·방향 맞추기

- 새 파일 `ui/photoPrep.ts`
  - `export function fitSize(w: number, h: number, maxSide: number): { w: number; h: number }`: 긴 변이 `maxSide`를 넘으면 비율대로 줄인 크기, 아니면 그대로 (순수 함수, 검사 대상)
  - `export async function prepPhoto(file: File, maxSide = 1600): Promise<File>`: `createImageBitmap(file, { imageOrientation: 'from-image' })`로 EXIF 방향을 반영해 읽고, `fitSize` 크기의 canvas에 그려 JPEG(품질 0.9)로. 읽지 못하면(브라우저가 모르는 형식) **원본 그대로** 돌려준다
- `PhotoUpload.tsx`: `pick(file)`에서 **가장 먼저** `prepPhoto`를 부르고, 그 결과로 `photo.file`·미리보기 URL·`onPhoto`를 만든다. 그래야 네모(`PhotoBox`, 0~1 비율), `crop()`의 `naturalWidth`, `PhotoPlace.aspect`, 전개도 칸 밑 사진(TODO-36·37)이 모두 같은 그림을 기준으로 한다
- 새 검사 `ui/photoPrep.test.ts` (`fitSize`만. Node에는 canvas가 없다) → `package.json`의 `test` 스크립트 끝에 추가
- backend의 "같은 사진 기억"은 줄인 사진 바이트의 해시가 된다. 같은 원본을 다시 골라도 브라우저가 같은 JPEG를 만들면 기억이 맞는다 (안 맞아도 한도만 조금 더 쓴다)
- 확인: 줄인 사진으로 인식 정확도가 떨어지지 않는지 `evals/vision_eval.py`로 한 번 잰다 (사진을 1600px로 줄여서)

## E. M3: 원근 보정 (종이 펴기)

- 흐름: 사진 고르기 → (M2 줄이기) → 네모 감싸기·읽기. 네모 단계 버튼 아래 **"비스듬히 찍혔으면 종이 펴기"**를 누를 때만 펴기 단계로 간다 (반듯한 스캔은 한 단계를 더 거치지 않게. 2026-10-31 구현하며 바꿈)
  - 종이 펴기: 사진 위 네 손잡이(처음엔 사진 안쪽 8%)를 학습지 귀퉁이로 끌어 맞추고 "펴기" 또는 "그대로 쓰기"
  - "펴기" 결과 그림이 이후 단계의 `photo`가 된다 (네모·crop·`onPhoto` 모두 편 그림 기준. `PhotoUpload`의 `setBase`)
  - 1200×1600 사진을 펴는 데 PC 크롬에서 약 0.9초
- 새 파일 `ui/perspective.ts` (three.js·DOM 없음, 검사 대상)
  - `homography(src: Pt[4], dst: Pt[4]): number[]` (3×3, 9개)
  - `warp(img: ImageData, corners: Pt[4], outW: number, outH: number): ImageData` (역변환 + 이중선형 보간)
  - 출력 크기: 귀퉁이 사이 변 길이의 평균으로 정하고 `fitSize(…, 1600)`로 제한
- 새 파일 `ui/CornerPick.tsx`: 네 귀퉁이 끌기 UI. 결과는 `onDone(file: File)`, 취소는 `onCancel()`
- 새 검사 `ui/perspective.test.ts` (정사각형 ↔ 사다리꼴 왕복, 점이 제자리로 오는지)
- **의존성 추가 없음**. 귀퉁이 자동 찾기(OpenCV.js 등)는 용량이 커서 이번에 넣지 않는다. 넣을 때는 `stack.md` 절차를 따른다
- 문서: `specs/ui.md` 화면 배치 2번(사진 업로드)에 종이 펴기 단계를 먼저 적는다

## F. M4: 촬영 안내 화면

- **HTTPS 필요** (`getUserMedia`는 localhost 아니면 HTTPS에서만 된다). 배포 방식이 정해진 뒤에 한다
- 새 파일 `ui/CameraCapture.tsx`: `getUserMedia({ video: { facingMode: 'environment' } })` 미리보기 + 학습지 비율 틀 + 셔터. 찍으면 canvas → `File` → `onShot(file)`
- `PhotoUpload.tsx`: "카메라로 찍기" 버튼 추가. 찍은 파일은 **`pick(file)`으로 들어간다** (입력 경로가 둘이어도 입구는 하나)
- 권한 거부·HTTP·지원 안 함이면 버튼을 숨기고 지금의 `input[type=file]`만 쓴다. **기존 올리기 버튼은 지우지 않는다**

## G. M5: 휴대폰 화면 다듬기

| 문제 | 고칠 곳 | 방향 |
|---|---|---|
| 챗봇 아이콘(`.chat-fab`)이 패널 아래쪽 버튼을 가림 | `index.css` 좁은 화면 | 패널 맨 아래에 아이콘 높이만큼 여백 |
| 다 접은 도형이 3D 영역에 비해 작음 | `viewer/` 카메라 거리 | **`viewer.md`를 먼저 고친다**. 좁은 화면에서 도형에 맞춰 더 가까이 |
| 3D 아래 안내 문구가 두 줄 | `index.css` 또는 `ui.md` 문구 | 좁은 화면 글자 크기·문구 줄이기 |
| 터치 대상이 작은 버튼 | `index.css` `@media (pointer: coarse)` | 44px 이상 |

- 확인: 크롬 개발자 도구 기기 모드(390×844, 360×800) + 실제 휴대폰(M1 LAN)

---

## H. 변경 지도 (합칠 때 보는 표)

N = 새 파일, M = 고침. "겹침"은 다른 팀원 작업과 충돌할 가능성이다 (최근 PR #99~#119 기준).

| 파일 | M1 | M2 | M3 | M4 | M5 | 겹침 |
|---|---|---|---|---|---|---|
| `frontend/src/ui/api.ts` | M | | | | | 낮음 (한 줄) |
| `frontend/.env.example` | N | | | | | 없음 |
| `backend/app/main.py` | M | | | | | 낮음 |
| `backend/.env.example` | M | | | | | 낮음 |
| `frontend/src/ui/photoPrep.ts` (+ `.test.ts`) | | N | | | | 없음 |
| `frontend/src/ui/perspective.ts` (+ `.test.ts`) | | | N | | | 없음 |
| `frontend/src/ui/CornerPick.tsx` | | | N | | | 없음 |
| `frontend/src/ui/CameraCapture.tsx` | | | | N | | 없음 |
| `frontend/src/ui/PhotoUpload.tsx` | | M | M | M | | **높음** (M2~M4가 차례로 고침, #104도 고쳤음) |
| `frontend/src/index.css` | | | M | M | M | **높음** (거의 모든 UI PR이 고침) |
| `frontend/src/viewer/ThreeViewer.tsx`, `CurvedViewer.tsx` | | | | | M | **높음** (설명 모드·곡면 PR들이 고침) |
| `frontend/package.json` (`test` 줄) | | M | M | | | 중간 (같은 한 줄) |
| `frontend/src/ui/App.tsx` | | | | | | 고치지 않는다 |
| `docs/specs/api.md`, `stack.md`, `README.md` | M | | | M | | 낮음 |
| `docs/specs/ui.md` | | | M | M | M | **높음** |
| `docs/specs/viewer.md` | | | | | M | 중간 |
| `docs/01-folder-architecture.md` (`ui/` 칸) | | M | M | M | | 중간 (같은 칸 한 줄) |

## I. 합칠 때 규칙

- **입구는 `pick(file)` 하나**: 파일 고르기·카메라 모두 `pick`으로 들어가고, `pick` 안에서 `prepPhoto` → (종이 펴기) → 네모 단계 순서. 다른 곳에서 사진 상태를 직접 바꾸지 않는다
- **`PhotoUpload` Props는 그대로** (`onScene`, `onPhoto`). 바꿔야 하면 `ui.md`에 먼저 적고 팀에 알린다
- **`index.css`**: 기존 규칙을 옮기거나 줄바꿈·정렬을 다시 하지 않는다. 새 규칙은 관련 블록 바로 아래에 붙이고, 좁은 화면 규칙은 기존 `@media (max-width: 1023px)` 블록 **끝에** 더한다
- **`package.json` `test`**: 기존 순서를 두고 끝에 `&& node src/ui/….test.ts`만 붙인다. 충돌하면 양쪽 검사를 모두 남긴다
- **`01-folder-architecture.md`의 `ui/` 칸**: 새 파일 이름만 괄호 목록 끝에 더한다
- 합치기 전에 main을 받아 다시 맞추고(rebase 또는 merge), 아래를 모두 통과시킨다
  ```sh
  cd frontend && npm run build && npm run lint && npm test
  cd backend && ruff check . && ruff format --check . && python -m tests.test_schema && python -m tests.test_chat && python -m tests.test_vision_eval && python -m tests.test_analyze
  ```
- 휴대폰 확인 (M1 이후 매번): ① 사진 찍기 → 전체 읽기 ② 네모로 읽기 ③ 전개도 칸 밑 사진 위치가 맞는지(TODO-36·37) ④ 인식 실패 → 전개도 그리기 안내 ⑤ 챗봇 열고 닫기 ⑥ 가로 화면 회전
- PC에서 예전과 똑같이 되는지도 본다: `.env` 없이 `npm run dev` + `uvicorn`만으로 지금처럼 동작해야 한다 (기본값 유지)
