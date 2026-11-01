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
python -m tests.test_vision_eval
python -m tests.test_analyze
```

## 시연할 때 (로컬 실행 순서)

터미널 두 개를 열고, **backend 먼저, 그다음 frontend** 를 켭니다. 처음 한 번은 위 "실행"의 설치 단계를 먼저 합니다.

```sh
# 터미널 1: backend (사진 인식·챗봇)
cd backend
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
uvicorn app.main:app --reload --env-file .env

# 터미널 2: frontend
cd frontend
npm run dev
```

1. 브라우저에서 http://localhost:5173 을 엽니다. 코드를 바꾼 뒤라면 Ctrl+F5 로 새로고침합니다.
2. 책 차례에서 도형을 고르거나, 학습지 사진을 올려 시작합니다.

사진 인식은 인터넷과 Gemini 한도가 필요합니다 (무료 한도: 모델당 하루 20번, 한국 시간 오후 4시쯤 다시 채워짐). 한도를 아끼려면 시연 직전에 측정을 돌리지 않습니다.
인터넷이나 한도가 막혀도 접기·공식 설명·전개도 그리기·사진 따라 그리기는 backend 없이 됩니다. 사진 인식 비상 경로(Gemini CLI)는 [docs/specs/api.md](docs/specs/api.md) "/analyze 에러"를 봅니다.

### 휴대폰으로 열기 (같은 와이파이)

PC의 와이파이 IP(`ipconfig`)가 `172.16.0.10`이라면:

1. `backend/.env`에 `CORS_ORIGINS=http://172.16.0.10:5173`, `frontend/.env`에 `VITE_API_URL=http://172.16.0.10:8000` (`frontend/.env.example`을 복사)
2. backend는 `uvicorn app.main:app --reload --env-file .env --host 0.0.0.0`, frontend는 `npm run dev -- --host`
3. 휴대폰에서 http://172.16.0.10:5173 을 엽니다. 안 열리면 Windows 방화벽에서 5173·8000 포트를 허용합니다

HTTP라서 "카메라로 찍기"(실시간 미리보기)는 보이지 않고, "학습지 사진 올리기"로 카메라 촬영을 씁니다. 자세한 것은 [docs/specs/mobile.md](docs/specs/mobile.md).

### 팀 테스트: API 없이 사진 인식 (Antigravity CLI)

API 비용 없이 팀원끼리 시험할 때만 씁니다. 각자 자기 컴퓨터에 Antigravity CLI(`agy`)를 설치하고 로그인합니다.

1. `backend/.env`에 `VISION_ENGINE=agy` (모델을 바꾸려면 `VISION_AGY_MODEL`, 목록은 `agy models`)
2. backend를 다시 켭니다. 사진 한 장에 2분쯤 걸리고, 같은 사진은 backend가 켜져 있는 동안 바로 나옵니다

학생이 쓰는 배포 서버에서는 켜지 않습니다 (개인 계정 사용량). 자세한 것은 [docs/specs/worksheets.md](docs/specs/worksheets.md).

## 배포

프론트: [Vercel](https://vercel.com) · 백엔드: [Render](https://render.com)

### 백엔드 (Render) 먼저

1. Render 대시보드 → **New Blueprint** → 이 저장소 연결
   - `render.yaml`을 자동으로 읽어 `foldy-backend` 서비스를 만든다
2. Environment 탭에서 환경 변수 두 개를 설정한다:
   - `LLM_API_KEY` = Gemini API 키 ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
   - `CORS_ORIGINS` = 나중에 Vercel에서 받을 주소 (처음엔 비워도 됨, 이후 업데이트)
3. 배포 완료 후 서비스 URL을 메모한다 (예: `https://foldy-backend.onrender.com`)

> Render 무료 플랜은 15분 비활성 시 슬립된다. 행사 전에 한 번 미리 접속해 깨워 둔다.

### 프론트엔드 (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → 이 저장소 연결
2. **Root Directory**를 `frontend`로 설정 (Framework: Vite 자동 감지)
3. Environment Variables에 추가:
   - `VITE_API_URL` = 위 Render 서비스 URL (예: `https://foldy-backend.onrender.com`)
4. Deploy

### 배포 후 CORS 업데이트

Vercel 배포 완료 후 받은 URL(예: `https://foldy.vercel.app`)을 Render의 `CORS_ORIGINS` 환경 변수에 넣고 재배포한다.

배포 주소: (배포 후 여기에 기입)

---

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
