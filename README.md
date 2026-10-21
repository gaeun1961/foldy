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

## 일하는 방식

폴더별 담당은 없습니다. [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md)에서 TODO(반나절~하루 크기)를 하나 골라, 연결된 GitHub 이슈에 자기 자신을 assignee로 지정하고 시작합니다. assignee가 있는 이슈는 건드리지 않습니다.
브랜치와 PR은 그 이슈 번호를 쓰고, PR 본문에 `Closes #이슈번호`를 넣습니다.
TODO는 3D 뷰어 / AI / UI·통합 / 발표 영역으로 묶여 있고, 🟢 표시는 선행 TODO 없이 바로 시작할 수 있는 항목입니다.

## 문서

작업 전에 [AGENTS.md](AGENTS.md)와 아래 문서를 먼저 읽습니다.

- [docs/01-folder-architecture.md](docs/01-folder-architecture.md): 폴더 구조, 폴더별 책임
- [docs/02-specs.md](docs/02-specs.md): 기술 스택, 구현 규칙, ShapeScene 데이터 계약, API
- [docs/03-product-plan.md](docs/03-product-plan.md): 대상 사용자, 핵심 기능, 단계별 범위(1차 직육면체 → 2차 정다면체 → 3차 원기둥·원뿔)
- [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md): 남은 작업 목록, TODO 이슈 링크
- [docs/reports/](docs/reports/): PR별 작업 기록
