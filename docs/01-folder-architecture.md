# 1) 폴더 아키텍처

이 문서는 foldy 저장소의 폴더 구조와 폴더별 책임(무슨 코드가 어디에 있는지)을 정의합니다.
폴더별 담당자는 없습니다. 누가 무엇을 하는지는 TODO마다 연결된 GitHub 이슈의 assignee로 정합니다 (`docs/todo/00-todo-list.md`의 이슈 칸).

---

## A. Top-level 구조

```txt
foldy
├─ AGENTS.md                         # 에이전트·팀원 공통 작업 합의서
├─ README.md                         # 프로젝트 소개, 실행 방법
├─ .github
│  └─ pull_request_template.md       # 커밋·PR 본문 형식
├─ frontend                          # Vite + React + TypeScript
│  ├─ index.html
│  ├─ package.json
│  ├─ lab                            # 실험 페이지 (서비스 빌드에 안 들어감)
│  └─ src
│     ├─ main.tsx                    # 진입점 (ui/App 렌더)
│     ├─ index.css                   # 전역 스타일, 화면 배치
│     ├─ viewer                      # 3D 뷰어
│     ├─ ui                          # 화면 구성, API 연결
│     └─ shared                      # 공용 타입, 목 데이터
├─ backend                           # FastAPI
│  ├─ requirements.txt
│  ├─ .env.example                   # 복사해서 .env 로 사용 (.env 는 커밋 금지)
│  ├─ app
│  │  ├─ main.py                     # FastAPI 앱, CORS, 라우터 등록
│  │  ├─ api                         # 라우터
│  │  └─ ai                          # 사진 인식, 챗봇, ShapeScene 스키마
│  ├─ tests                          # 검사 스크립트 (python -m tests.test_schema, test_chat, test_vision_eval)
│  └─ evals                          # 비전 LLM 정확도 측정 (사진은 git 에 안 올림)
└─ docs                              # 기준 문서
   ├─ 01-folder-architecture.md
   ├─ 02-specs.md                    # specs 목차 ("이런 작업이면 이 파일")
   ├─ 03-product-plan.md
   ├─ specs                          # 주제별 스펙 (필요한 것만 읽음)
   │  ├─ stack.md                    # 기술 스택, 공통 구현 규칙
   │  ├─ shape-scene.md              # ShapeScene 데이터 계약
   │  ├─ viewer.md                   # three.js 뷰어 규칙
   │  ├─ api.md                      # backend API
   │  └─ ui.md                       # UI 기준 (팀 시안 기준)
   ├─ design                         # 디자인 참고 이미지 (기본으로 읽지 않음)
   ├─ reports                        # 작업 기록 (TODO 하나당 하나, 기본으로 읽지 않음)
   │  └─ _template.md
   └─ todo                           # 후속 작업
      ├─ _template.md
      └─ 00-todo-list.md
```

> `docs/reports`는 완료된 작업 기록을 남기는 곳입니다.
> `docs/todo`는 선행 작업이나 결정이 필요해 지금 당장 처리하지 못하는 후속 작업을 남기는 곳입니다.
> `docs/specs`는 주제별 스펙이고, 무엇을 읽을지는 `AGENTS.md`의 읽기 안내와 `docs/02-specs.md` 목차를 따릅니다.
> `docs/design`은 팀 시안 스크린샷입니다 (`net-folding-ref.png` 등). 서비스 코드에 쓰지 않고 `specs/ui.md`에서 참고로 링크합니다.

---

## B. 폴더별 책임

| 폴더 | 들어가는 코드 |
|---|---|
| `frontend/src/viewer/` | 3D 뷰어. `index.ts`(`ViewerProps`, `Viewer` export), `ThreeViewer.tsx`(three.js 화면), `bookScene.ts`(책상·펼친 책 장면, 전개도가 오른쪽 페이지 위에 놓임), `EmptyBook.tsx`(도형이 없을 때 빈 책 + 차례), `opening.ts`(처음 들어왔을 때 빈 책 위에서 도는 팝업북 오프닝), `Viewer.tsx`(도형에 맞는 화면 고르기), `CurvedViewer.tsx`·`curved.ts`(원기둥·원뿔 말기), `polyhedra.ts`(다면체 면 트리 데이터, three.js 없음), `gridNet.ts`(학습지 전개도 grid → 면 트리, 정육면체 전개도 11가지 → 치수에 맞춘 grid, three.js 없음), `faceTree.ts`(면 트리 → pivot 계층, 펼침 값 적용), `faceTree.test.ts`(`npm test`), `lessons/`(설명 모드: `data.ts` 종류·단계 수·공식, `index.ts` 만들기, `volume.ts` 부피, `volumeLayout.ts` 조각 배치, `surfaceArea.ts` 겉넓이, `surfaceLayout.ts` 면 쌍·넓이, `pythagoras.ts` 대각선·최단 거리, `pythagorasLayout.ts` 직각삼각형·곧은 길 계산, `edgeRelations.ts` 위치 관계, `edgeRelationsLayout.ts` 모서리 관계 계산, `similar.ts` 닮음, `similarLayout.ts` k배 배치, `draw.ts` 공용 그리기, `lessons.test.ts`). `penDraw.ts`(펜으로 그려 내기: 펜 모형·가림 그림·가림 셰이더), `penSweep.ts`(펜이 지나는 지그재그 길, three.js 없음), `penSweep.test.ts`, `photoUv.ts`(학습지 사진을 홀로그램 면에 입히는 UV·반전, three.js 없음, `photoUv.test.ts`), `pageSlots.ts`(한 페이지에 도형 여러 개 놓기, three.js 없음, `pageSlots.test.ts`). 면 렌더링, 전개도 접기, 면 위 선분, 꼭짓점 하이라이트·클릭.  | 홀로그램(viewer.md "홀로그램"): `theme.ts`(3D 디자인 토큰 `PAPER`·`HOLOGRAM`), `stage.ts`(무대: 장면 + 토큰 → 바닥에 놓인 도형·접기·범위, three.js), `stage.test.ts`, `HologramViewer.tsx`(무대를 카메라 4대로 비춰 사다리꼴 4칸), `holoLayout.ts`(칸 배치·반사 방향·크기 계산, three.js 없음), `holoLayout.test.ts`, `worksheetScenes.ts`(실제 학습지 정답 도형, 테스트용).
| `frontend/lab/` | 실험용 페이지. 서비스 화면과 분리된 HTML + TS 파일로, `npm run dev` 중 `http://localhost:5173/lab/{파일}.html`로 연다. `npm run build`에는 들어가지 않는다. `src/`의 코드를 import할 수 있지만 `src/`는 `lab/`을 import하지 않는다. `page-slots.html`(여러 도형 배치 미리보기: 정육면체·섞인 직육면체 전개도 1~6개), `book-pen.html`(책 위에 펜으로 그려 내기 시연: 전개도 1~6개를 "책 안에 맞추기"와 "띄워서 크게"로 비교, 천천히 보기). 지금은 `geogebra.html`(TODO-1 GeoGebra 실험 기록. **실험용이며 서비스에 쓰지 않음**, 3D는 three.js로 결정) |
| `frontend/src/ui/` | 화면 구성과 backend 연결. `App.tsx`(업로드 / 뷰어 / 챗봇 배치), `api.ts`(backend 주소와 호출, `/analyze`·`/chat`), `PhotoUpload.tsx`(학습지 사진 올리기, 휴대폰은 올리기·촬영하기 두 칸), `photoPrep.ts`(사진 줄이기·방향), `perspective.ts`·`CornerPick.tsx`(종이 펴기), `device.ts`(PC·휴대폰 구분), `NetPreview.tsx`(인식한 전개도 그림), `worksheetStore.ts`·`WorksheetShelf.tsx`(내 학습지 보관함, IndexedDB), `ChatPanel.tsx`(챗봇 아이콘·대화창), `FaceMarks.tsx`·`markFace.ts`(아래 바의 면 표시), `FoldControls.tsx`(접기 조작), `LessonControls.tsx`(설명 모드 조작), `player.ts`(값을 목표로 움직이는 애니메이션, 접기·설명 공용), `HologramMode.tsx`(홀로그램 보기: 화면 전체, 가운데 조절, 전체 화면, 돌아가기). 사진 업로드, 수동 입력 폼 |
| `frontend/src/shared/` | 공용 코드. `types.ts`(ShapeScene 타입). ShapeScene 변경은 이슈로 합의. 목 데이터는 두지 않는다 (사진 인식·수동 입력으로만 도형이 생김) |
| `backend/app/ai/` | LLM 관련 코드. `schema.py`(ShapeScene Pydantic), `vision.py`(사진 → ShapeScene), `agy.py`(팀 테스트 엔진 Antigravity CLI 실행: 미리 띄워 두기·늦으면 하나 더), `vision_prompt.py`(비전 프롬프트), `chat.py`(챗봇 답변과 프롬프트) |
| `backend/evals/` | 비전 LLM 정확도 측정 (TODO-7). `vision_eval.py`(`python -m evals.vision_eval [--model 이름]`, LLM을 실제로 부름), `answers.json`(사진별 정답 ShapeScene). `photos/`(학습지 사진)와 `results/`는 저작권·용량 때문에 git에 올리지 않는다 |
| `backend/app/api/` | 라우터. `routes.py`(`/health`, `/analyze`, `/chat`). `ai/` 함수를 부르기만 한다 |
| `backend/tests/` | 테스트 프레임워크 없이 돌리는 검사 스크립트. `test_schema.py`(ShapeScene 도형별 검증), `test_chat.py`(챗봇 화면 조작 값 거르기, LLM 호출 없음), `test_vision_eval.py`(비전 정확도 비교 함수, LLM 호출 없음), `test_analyze.py`(`/analyze` 에러·재시도·같은 사진 기억, LLM 호출 없음) |
| `docs/` | 기준 문서(01·02·03, `specs/`), 디자인 참고(`design/`), 작업 기록(`reports/`), TODO(`todo/`) |
| `.github/` | GitHub 설정. `pull_request_template.md`(커밋·PR 본문 형식) |

---

## C. 의존 규칙

- `ui` → `viewer`는 `viewer/index.ts`를 통해서만 import한다 (구현 파일 직접 import 금지)
- `lab` → `src`는 가능, `src` → `lab`은 금지
- `viewer`, `ui`는 모두 `shared`를 import할 수 있다. `shared`는 다른 폴더를 import하지 않는다
- `api` → `ai`는 가능, `ai` → `api`는 금지