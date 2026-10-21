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
│  └─ tests                          # 검사 스크립트 (python -m tests.test_schema)
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
| `frontend/src/viewer/` | 3D 뷰어. `index.ts`(`ViewerProps`, `Viewer` export), `ThreeViewer.tsx`(three.js 구현). 면 렌더링, 전개도 접기, 면 위 선분, 꼭짓점 하이라이트·클릭. 앞으로 `polyhedra.ts`(다면체 면 트리 데이터, TODO-2)와 `curved.ts`(원기둥·원뿔 말기, TODO-17)가 들어온다 |
| `frontend/lab/` | 실험용 페이지. 서비스 화면과 분리된 HTML + TS 파일로, `npm run dev` 중 `http://localhost:5173/lab/{파일}.html`로 연다. `npm run build`에는 들어가지 않는다. `src/`의 코드를 import할 수 있지만 `src/`는 `lab/`을 import하지 않는다. 지금은 `geogebra.html`(TODO-1 GeoGebra 실험 기록. **실험용이며 서비스에 쓰지 않음**, 3D는 three.js로 결정) |
| `frontend/src/ui/` | 화면 구성과 backend 연결. `App.tsx`(업로드 / 뷰어 / 챗봇 배치). 사진 업로드, 수동 입력 폼, 챗봇 대화창, API 호출 |
| `frontend/src/shared/` | 공용 코드. `types.ts`(ShapeScene 타입), `mock.ts`(목 데이터). ShapeScene 변경은 이슈로 합의 |
| `backend/app/ai/` | LLM 관련 코드. `schema.py`(ShapeScene Pydantic), `vision.py`(사진 → ShapeScene), `chat.py`(챗봇 답변), 프롬프트 |
| `backend/app/api/` | 라우터. `routes.py`(`/health`, `/analyze`, `/chat`). `ai/` 함수를 부르기만 한다 |
| `backend/tests/` | 의존성 없이 돌리는 검사 스크립트. `test_schema.py`(ShapeScene 도형별 검증) |
| `docs/` | 기준 문서(01·02·03, `specs/`), 디자인 참고(`design/`), 작업 기록(`reports/`), TODO(`todo/`) |
| `.github/` | GitHub 설정. `pull_request_template.md`(커밋·PR 본문 형식) |

---

## C. 의존 규칙

- `ui` → `viewer`는 `viewer/index.ts`를 통해서만 import한다 (구현 파일 직접 import 금지)
- `lab` → `src`는 가능, `src` → `lab`은 금지
- `viewer`, `ui`는 모두 `shared`를 import할 수 있다. `shared`는 다른 폴더를 import하지 않는다
- `api` → `ai`는 가능, `ai` → `api`는 금지