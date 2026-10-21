# 1) 폴더 아키텍처

이 문서는 foldy 저장소의 폴더 구조와 폴더별 책임(무슨 코드가 어디에 있는지)을 정의합니다.
폴더별 담당자는 없습니다. 누가 무엇을 하는지는 `docs/todo/00-todo-list.md`의 TODO 담당자 칸으로 정합니다.

---

## A. Top-level 구조

```txt
foldy
├─ AGENTS.md                         # 에이전트·팀원 공통 작업 합의서
├─ README.md                         # 프로젝트 소개, 실행 방법
├─ frontend                          # Vite + React + TypeScript
│  ├─ index.html
│  ├─ package.json
│  └─ src
│     ├─ main.tsx                    # 진입점 (ui/App 렌더)
│     ├─ index.css                   # 전역 스타일, 화면 배치
│     ├─ viewer                      # 3D 뷰어
│     ├─ ui                          # 화면 구성, API 연결
│     └─ shared                      # 공용 타입, 목 데이터
├─ backend                           # FastAPI
│  ├─ requirements.txt
│  ├─ .env.example                   # 복사해서 .env 로 사용 (.env 는 커밋 금지)
│  └─ app
│     ├─ main.py                     # FastAPI 앱, CORS, 라우터 등록
│     ├─ api                         # 라우터
│     └─ ai                          # 사진 인식, 챗봇, ShapeScene 스키마
└─ docs                              # 기준 문서
   ├─ 01-folder-architecture.md
   ├─ 02-specs.md                    # 기술 스펙, ShapeScene 계약, API
   ├─ 03-product-plan.md
   ├─ reports                        # 작업 기록 (PR 하나당 하나)
   │  └─ _template.md
   └─ todo                           # 후속 작업
      ├─ _template.md
      └─ 00-todo-list.md
```

> `docs/reports`는 완료된 작업 기록을 남기는 곳입니다.
> `docs/todo`는 선행 작업이나 결정이 필요해 지금 당장 처리하지 못하는 후속 작업을 남기는 곳입니다.

---

## B. 폴더별 책임

| 폴더 | 들어가는 코드 |
|---|---|
| `frontend/src/viewer/` | 3D 뷰어. `index.ts`(`ViewerProps`, `Viewer` export), `ThreeViewer.tsx`(three.js 구현). 면 렌더링, 전개도 접기, 면 위 선분, 꼭짓점 하이라이트·클릭 |
| `frontend/src/ui/` | 화면 구성과 backend 연결. `App.tsx`(업로드 / 뷰어 / 챗봇 배치). 사진 업로드, 수동 입력 폼, 챗봇 대화창, API 호출 |
| `frontend/src/shared/` | 공용 코드. `types.ts`(ShapeScene 타입), `mock.ts`(목 데이터). ShapeScene 변경은 이슈로 합의 |
| `backend/app/ai/` | LLM 관련 코드. `schema.py`(ShapeScene Pydantic), `vision.py`(사진 → ShapeScene), `chat.py`(챗봇 답변), 프롬프트 |
| `backend/app/api/` | 라우터. `routes.py`(`/health`, `/analyze`, `/chat`). `ai/` 함수를 부르기만 한다 |
| `docs/` | 기준 문서, 작업 기록, TODO |

---

## C. 의존 규칙

- `ui` → `viewer`는 `viewer/index.ts`를 통해서만 import한다 (`ThreeViewer.tsx` 직접 import 금지)
- `viewer`, `ui`는 모두 `shared`를 import할 수 있다. `shared`는 다른 폴더를 import하지 않는다
- `api` → `ai`는 가능, `ai` → `api`는 금지