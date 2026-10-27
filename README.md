# foldy

입체도형을 머릿속으로 그리기 어려운 초·중학생을 위한 학습 도우미입니다.
학습지 사진을 찍으면 도형과 전개도를 3D로 띄우고, 접히는 과정과 면 위 선의 위치를 보여주며, 챗봇이 화면을 조작해 힌트를 줍니다. (2026 가천대 IT융합대학 메이커톤, 주제 "TECH FOR LIFE")

## 실행

frontend (http://localhost:5173)

필요한 Node 버전은 **22.18.0 이상(22.x)이거나 23.6.0 이상**입니다 (`node --version`으로 확인). `npm test`가 Node의 TypeScript 바로 실행 기능을 쓰는데, 그보다 낮은 버전에서는 `Unknown file extension ".ts"` 오류가 납니다.

```sh
cd frontend
npm install
npm run dev
npm test      # 면 트리 검사
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

backend 검사 (PR 전에, 가상환경을 켠 상태에서). 검사 도구 `ruff`는 `requirements.txt`에 들어 있어서 위 `pip install -r requirements.txt`로 같이 설치됩니다. 가상환경 없이 쓰려면 `pip install ruff`.

```sh
cd backend
ruff check .
ruff format --check .
python -m tests.test_schema
python -m tests.test_chat
```

## 일하는 방식

1. [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md) 맨 위 "지금 시작 가능"에서 하나 고른다
2. 그 이슈에 자기 자신을 assignee로 걸고 시작한다
3. 끝나면 PR 본문에 `Closes #이슈번호`를 넣는다

## 문서

작업 전에 [AGENTS.md](AGENTS.md)를 읽습니다. 어떤 문서를 언제 읽는지는 AGENTS.md의 "읽기 안내"에 있습니다.

- [docs/01-folder-architecture.md](docs/01-folder-architecture.md): 폴더 구조, 폴더별 책임
- [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md): 남은 작업 목록, 우선순위, TODO 이슈 링크
- [docs/02-specs.md](docs/02-specs.md): 스펙 목차. 주제별 스펙은 [docs/specs/](docs/specs/) (데이터 계약, 뷰어, API, 기술 스택, UI)
- [docs/03-product-plan.md](docs/03-product-plan.md): 대상 사용자, 핵심 기능, 단계별 범위(1차 직육면체 → 2차 정다면체·각기둥·각뿔 → 3차 원기둥·원뿔·구)
- [docs/design/](docs/design/): 팀 시안 스크린샷 (UI 방향 참고용)
- [docs/reports/](docs/reports/): TODO별 작업 기록
