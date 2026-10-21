# foldy

입체도형을 머릿속으로 그리기 어려운 초·중학생을 위한 학습 도우미입니다.
학습지 사진을 찍으면 도형과 전개도를 3D로 띄우고, 접히는 과정과 면 위 선의 위치를 보여주며, 챗봇이 화면을 조작해 힌트를 줍니다. (2026 가천대 IT융합대학 메이커톤, 주제 "TECH FOR LIFE")

## 실행

frontend (http://localhost:5173)

```sh
cd frontend
npm install
npm run dev
```

backend (http://localhost:8000, API 문서 http://localhost:8000/docs)

```sh
cd backend
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # macOS/Linux: cp .env.example .env, 그 뒤 값 채우기
uvicorn app.main:app --reload --env-file .env
```

## 역할 분담

| 역할 | 담당 폴더 |
|---|---|
| AI (사진 인식·챗봇) | `backend/app/ai/` |
| 3D 뷰어 | `frontend/src/viewer/` |
| UI·통합 | `frontend/src/ui/`, `backend/app/api/` |

자세한 담당 범위: [docs/01-folder-architecture.md](docs/01-folder-architecture.md)

## 문서

작업 전에 [AGENTS.md](AGENTS.md)와 아래 문서를 먼저 읽습니다.

- [docs/01-folder-architecture.md](docs/01-folder-architecture.md): 폴더 구조, 폴더별 담당
- [docs/02-specs.md](docs/02-specs.md): 기술 스택, 구현 규칙, ShapeScene 데이터 계약, API
- [docs/03-product-plan.md](docs/03-product-plan.md): 대상 사용자, 핵심 기능, 1차 범위
- [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md): 남은 작업 목록
- [docs/reports/](docs/reports/): PR별 작업 기록
