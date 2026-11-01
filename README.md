# foldy

입체도형을 머릿속으로 그리기 어려운 초·중학생을 위한 학습 도우미입니다.
학습지 사진을 찍으면 도형과 전개도를 3D로 띄우고, 접히는 과정과 면 위 선의 위치를 보여주며, 챗봇이 화면을 조작해 힌트를 줍니다.

2026 가천대 IT융합대학 메이커톤(주제 "TECH FOR LIFE") 출품작입니다.

**써 보기: https://foldy-tau.vercel.app**

> 백엔드가 Render 무료 서버라 한동안 쓰지 않으면 잠듭니다. 사진 인식이나 챗봇의 첫 응답이 늦으면 https://foldy.onrender.com/health 를 한 번 열어 깨운 뒤 다시 시도합니다. 사진 인식과 챗봇을 못 써도 직접 만들기와 접기는 됩니다.

## 주요 기능

- **사진 인식**: 문제 칸과 도형을 네모로 고르면 Gemini가 도형·치수·꼭짓점 라벨·선을 읽습니다. 도형 위치를 미리 추천하고, 한 문제에 도형이 여러 개여도 됩니다
- **직접 만들기**: 인식이 틀리거나 인터넷이 없어도 치수와 전개도를 직접 입력해 씁니다
- **3D 보기와 접기**: 전개도가 입체로 접히는 과정을 돌려 보고, 전개도 위 선이 입체의 어디로 가는지 확인합니다
- **설명 모드**: 겉넓이, 부피, 위치 관계, 피타고라스, 닮음, 최단 거리, 회전체, 단면을 도형 위에서 보여 줍니다
- **챗봇 힌트**: 정답 대신 힌트를 주고, 도형을 접거나 꼭짓점을 강조해 함께 보여 줍니다
- **홀로그램**: 휴대폰에 아크릴 피라미드를 올리면 학습지 도형이 공중에서 접힙니다
- **내 학습지**: 읽은 학습지를 기기 안에 저장해 다시 인식하지 않고 엽니다

지원 도형은 직육면체, 정다면체 5종, 각기둥, 각뿔, 원기둥, 원뿔, 구, 회전체입니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| frontend | React 19, TypeScript, Vite, three.js |
| backend | Python 3.13, FastAPI, Pydantic |
| LLM | Google Gemini (사진 인식, 챗봇) |
| 배포 | Vercel (frontend), Render (backend) |

LLM은 도형 데이터를 읽기만 하고, 3D는 그 데이터(`ShapeScene`)로 코드가 그립니다. API 키는 backend에만 둡니다.

## 만든 사람

[gaeun1961](https://github.com/gaeun1961) · [kimdaeone](https://github.com/kimdaeone) · [HandoA01](https://github.com/HandoA01)

## 실행

frontend (http://localhost:5173)

필요한 Node 버전은 **22.18.0 이상(22.x)이거나 23.6.0 이상**입니다 (`node --version`으로 확인). `npm test`가 Node의 TypeScript 바로 실행 기능을 쓰는데, 그보다 낮은 버전에서는 `Unknown file extension ".ts"` 오류가 납니다.

```sh
cd frontend
npm install
npm run dev
npm test
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

backend를 먼저 켜고 frontend를 켠 뒤 http://localhost:5173 을 엽니다. 코드를 바꾼 뒤라면 Ctrl+F5 로 새로고침합니다.

사진 인식은 인터넷과 Gemini 한도가 필요합니다 (무료 한도: 모델당 하루 20번, 한국 시간 오후 4시쯤 다시 채워짐). 인터넷이나 한도가 막혀도 접기·공식 설명·전개도 그리기·사진 따라 그리기는 backend 없이 됩니다. 사진 인식 비상 경로(Gemini CLI)는 [docs/specs/api.md](docs/specs/api.md) "/analyze 에러"를 봅니다.

### 검사

```sh
cd frontend
npm run build
npm run lint
npm test

cd backend
ruff check .
ruff format --check .
python -m tests.test_schema
python -m tests.test_chat
python -m tests.test_vision_eval
python -m tests.test_analyze
```

### 휴대폰으로 열기 (같은 와이파이)

PC의 와이파이 IP(`ipconfig`)가 `172.16.0.10`이라면:

1. `backend/.env`에 `CORS_ORIGINS=http://172.16.0.10:5173`, `frontend/.env`에 `VITE_API_URL=http://172.16.0.10:8000` (`frontend/.env.example`을 복사)
2. backend는 `uvicorn app.main:app --reload --env-file .env --host 0.0.0.0`, frontend는 `npm run dev -- --host`
3. 휴대폰에서 http://172.16.0.10:5173 을 엽니다. 안 열리면 Windows 방화벽에서 5173·8000 포트를 허용합니다

HTTP라서 "카메라로 찍기"(실시간 미리보기)는 보이지 않고, "학습지 사진 올리기"로 카메라 촬영을 씁니다. 자세한 것은 [docs/specs/mobile.md](docs/specs/mobile.md).

### 팀 테스트: API 없이 사진 인식 (Antigravity CLI)

API 비용 없이 팀원끼리 시험할 때만 씁니다. 각자 자기 컴퓨터에 Antigravity CLI(`agy`)를 설치하고 로그인합니다.

1. `backend/.env`에 `VISION_ENGINE=agy` (모델을 바꾸려면 `VISION_AGY_MODEL`, 목록은 `agy models`)
2. backend를 다시 켭니다. 잘라낸 도형 한 장에 15~20초쯤 걸리고, 같은 사진은 backend가 켜져 있는 동안 바로 나옵니다

학생이 쓰는 배포 서버에서는 켜지 않습니다 (개인 계정 사용량). 자세한 것은 [docs/specs/worksheets.md](docs/specs/worksheets.md).

## 배포

| | 주소 | 환경 변수 |
|---|---|---|
| frontend (Vercel) | https://foldy-tau.vercel.app | `VITE_API_URL=https://foldy.onrender.com` |
| backend (Render) | https://foldy.onrender.com | `LLM_API_KEY`, `CORS_ORIGINS=https://foldy-tau.vercel.app` |

**frontend는 main에 머지해도 자동으로 바뀌지 않습니다.** Vercel 프로젝트가 GitHub과 연결되어 있지 않아 CLI로 다시 올립니다.

```sh
cd frontend
npx vercel@latest login
npx vercel@latest link --project foldy
npx vercel@latest deploy --prod
```

backend는 `render.yaml`의 `autoDeploy: true`를 따릅니다.

새로 만들 때는 backend를 먼저 올립니다.

1. Render 대시보드 → **New Blueprint** → 이 저장소 연결 (`render.yaml`을 읽습니다)
2. Environment 탭에 `LLM_API_KEY`([aistudio.google.com/apikey](https://aistudio.google.com/apikey))를 넣습니다
3. Vercel에서 **Root Directory**를 `frontend`로 하고 `VITE_API_URL`에 Render 주소를 넣어 배포합니다
4. 받은 Vercel 주소를 Render의 `CORS_ORIGINS`에 넣고 다시 배포합니다. 변수 이름과 주소 앞뒤에 공백이 없어야 하고, 주소 끝에 `/`를 붙이지 않습니다

## 문서

작업 전에 [AGENTS.md](AGENTS.md)를 읽습니다. 어떤 문서를 언제 읽는지는 AGENTS.md의 "읽기 안내"에 있습니다.

- [docs/01-folder-architecture.md](docs/01-folder-architecture.md): 폴더 구조, 폴더별 책임
- [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md): 남은 작업 목록
- [docs/02-specs.md](docs/02-specs.md): 스펙 목차. 주제별 스펙은 [docs/specs/](docs/specs/) (데이터 계약, 뷰어, API, 기술 스택, UI)
- [docs/03-product-plan.md](docs/03-product-plan.md): 대상 사용자, 핵심 기능, 범위
- [docs/design/](docs/design/): 팀 시안 스크린샷 (UI 방향 참고용)
- [docs/reports/](docs/reports/): 작업 기록
