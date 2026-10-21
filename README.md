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

공용 데이터 형식: [docs/data-contract.md](docs/data-contract.md)
