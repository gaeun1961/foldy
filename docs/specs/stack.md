# 기술 스택과 공통 구현 규칙

frontend·backend 기술 스택과, 어느 영역에서든 지켜야 하는 공통 구현 규칙입니다.

## 기술 스택

### frontend (`frontend/`)
- **프레임워크**: React 19
- **언어**: TypeScript 6 (strict)
- **빌드 툴**: Vite 8
- **3D**: three.js (0.186, `OrbitControls`로 회전). TODO-1에서 GeoGebra와 비교한 뒤 플랜 B(three.js 직접 구현)로 결정 ([리포트](../reports/T01-geogebra-line-check.md))
- **린트**: oxlint (`npm run lint`)
- **검사**: `npm test` (면 트리 검사 `src/viewer/faceTree.test.ts`, Node가 TS를 바로 실행. 테스트 프레임워크 없음)
- **스타일링**: 일반 CSS (`src/index.css`), UI 라이브러리 없음
- **패키지 매니저**: npm

### backend (`backend/`)
- **언어**: Python 3.13
- **프레임워크**: FastAPI + uvicorn, 데이터 검증은 Pydantic v2
- **업로드**: python-multipart
- **LLM**: Google Gemini (`google-genai` SDK). 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 받아 `backend/.env`의 `LLM_API_KEY`에 넣는다. 챗봇 모델은 `gemini-3.5-flash-lite`(`backend/app/ai/chat.py`의 `MODEL`). Flash 계열은 2026-10 기준 과부하(504·503)가 잦았고, `gemini-2.5-*`는 새 사용자에게 막혀 있다
  - 사진 인식 비상 경로: `VISION_CLI=1`이면 API를 못 쓸 때 Gemini CLI로 한 번 더 시도한다([api.md](api.md) "/analyze 에러"). CLI는 저장소 의존성이 아니라 시연 컴퓨터에 따로 설치·로그인한다(`npm install -g @google/gemini-cli` 후 `gemini`로 한 번 로그인)
- **린트/포맷**: ruff (`ruff check .`, `ruff format .`)
- **검사**: `python -m tests.test_schema` (ShapeScene 도형별 검증), `python -m tests.test_chat` (챗봇 화면 조작 값 거르기). LLM은 부르지 않는다
- **환경 변수**: `backend/.env` (`uvicorn --env-file .env`로 읽음), 커밋은 `.env.example`만

## 공통 구현 규칙

- ShapeScene 타입은 `frontend/src/shared/types.ts`, `backend/app/ai/schema.py`에만 정의하고 가져다 쓴다
- `backend/app/api/` 라우터는 얇게 두고, 로직은 `backend/app/ai/`에 둔다
- **LLM 호출은 전부 backend에서** 한다. API 키(`LLM_API_KEY`)가 브라우저에 노출되면 안 되므로 frontend에서 LLM을 직접 호출하지 않는다
- 비전 LLM은 사진을 ShapeScene JSON으로 바꾸고, 결과는 `ShapeScene.model_validate`로 검증한다. 인식에 실패하면 사용자가 도형·치수를 직접 입력하는 **수동 경로**가 반드시 있어야 한다
- 비전 LLM 연결 위치는 `backend/app/ai/vision.py`의 `analyze_image`, 챗봇 연결 위치는 `backend/app/ai/chat.py`의 `reply`다. `backend/app/api/`의 라우터는 이 함수들을 부르기만 한다
- **뷰어는 인터페이스 뒤에 숨긴다**. UI는 `frontend/src/viewer/index.ts`의 `Viewer`와 `ViewerProps`만 사용하고, 구현을 바꿀 때는 이 파일의 export 한 줄만 교체한다
- frontend에는 목 데이터가 없다 (TODO-11). 도형은 사진 인식(`/analyze`) 결과나 수동 입력(TODO-12)으로만 생긴다. backend `vision.py`의 `MOCK_SCENE`은 검사(`tests/`)에서만 쓴다. `/analyze`는 실패하면 목 데이터 대신 에러를 돌려준다 ([api.md](api.md) "/analyze 에러")
- CORS는 Vite 개발 서버(`http://localhost:5173`, `http://127.0.0.1:5173`)만 허용한다
