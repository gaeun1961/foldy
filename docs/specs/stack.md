# 기술 스택과 공통 구현 규칙

frontend·backend 기술 스택과, 어느 영역에서든 지켜야 하는 공통 구현 규칙입니다.

## 기술 스택

### frontend (`frontend/`)
- **프레임워크**: React 19
- **언어**: TypeScript 6 (strict)
- **빌드 툴**: Vite 8
- **3D**: three.js (0.186, `OrbitControls`로 회전). TODO-1에서 GeoGebra와 비교한 뒤 플랜 B(three.js 직접 구현)로 결정 ([리포트](../reports/261021-1135-T01-geogebra-line-check.md))
- **린트**: oxlint (`npm run lint`)
- **검사**: `npm test` (면 트리 검사 `src/viewer/faceTree.test.ts`, Node가 TS를 바로 실행. 테스트 프레임워크 없음)
- **스타일링**: 일반 CSS (`src/index.css`), UI 라이브러리 없음
- **패키지 매니저**: npm

### backend (`backend/`)
- **언어**: Python 3.13
- **프레임워크**: FastAPI + uvicorn, 데이터 검증은 Pydantic v2
- **업로드**: python-multipart
- **린트/포맷**: ruff (`ruff check .`, `ruff format .`)
- **검사**: `python -m tests.test_schema` (ShapeScene 도형별 검증, 의존성 없음)
- **환경 변수**: `backend/.env` (`uvicorn --env-file .env`로 읽음), 커밋은 `.env.example`만

## 공통 구현 규칙

- ShapeScene 타입은 `frontend/src/shared/types.ts`, `backend/app/ai/schema.py`에만 정의하고 가져다 쓴다
- `backend/app/api/` 라우터는 얇게 두고, 로직은 `backend/app/ai/`에 둔다
- **LLM 호출은 전부 backend에서** 한다. API 키(`LLM_API_KEY`)가 브라우저에 노출되면 안 되므로 frontend에서 LLM을 직접 호출하지 않는다
- 비전 LLM은 사진을 ShapeScene JSON으로 바꾸고, 결과는 `ShapeScene.model_validate`로 검증한다. 인식에 실패하면 사용자가 도형·치수를 직접 입력하는 **수동 경로**가 반드시 있어야 한다
- 비전 LLM 연결 위치는 `backend/app/ai/vision.py`의 `analyze_image`, 챗봇 연결 위치는 `backend/app/ai/chat.py`의 `reply`다. `backend/app/api/`의 라우터는 이 함수들을 부르기만 한다
- **뷰어는 인터페이스 뒤에 숨긴다**. UI는 `frontend/src/viewer/index.ts`의 `Viewer`와 `ViewerProps`만 사용하고, 구현을 바꿀 때는 이 파일의 export 한 줄만 교체한다
- AI 기능이 붙기 전에는 목 데이터를 쓴다. frontend는 `frontend/src/shared/mock.ts`, backend는 `backend/app/ai/vision.py`의 `MOCK_SCENE`이며, 둘은 같은 내용을 유지한다
- CORS는 Vite 개발 서버(`http://localhost:5173`, `http://127.0.0.1:5173`)만 허용한다
