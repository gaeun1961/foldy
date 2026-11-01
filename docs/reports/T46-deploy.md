# 작업 기록 - 서비스 배포

- 일시: 2026-11-01 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 배포

## 요약
- frontend를 Vercel에, backend를 Render에 올렸다. 배포 설정(`render.yaml`, `runtime.txt`, README 절차)은 HandoA01이 추가했고, Render 서비스는 팀원이 올렸다
- frontend: https://foldy-tau.vercel.app (`VITE_API_URL=https://foldy.onrender.com`, 커밋 `7338be5` 기준)
- backend: https://foldy.onrender.com (`LLM_API_KEY`, `CORS_ORIGINS=https://foldy-tau.vercel.app`)

## 확인
- `/health` 200, Vercel 주소의 CORS 사전 요청 통과
- `/chat`을 실제로 불러 Gemini 힌트를 받음 (약 1.6초)
- `/analyze`에 이미지가 아닌 파일을 보내면 400과 안내 문구
- 프론트 번들에 API 키 형식 문자열과 `.env.local`이 없음
- 실제 학습지 사진 인식과 화면 동작은 이 작업에서 확인하지 않았다

## 결정
- `foldy.vercel.app`은 다른 서비스가 쓰고 있어 Vercel이 준 `foldy-tau.vercel.app`을 쓴다. 계정 이름이 붙은 주소는 Vercel 로그인을 요구하므로 쓰지 않는다
- Vercel 프로젝트는 GitHub과 연결하지 않고 CLI로 올렸다. main에 머지해도 frontend는 바뀌지 않는다 (재배포 방법은 README)

## 주요 변경 파일
- `README.md`: 배포 주소, 재배포 방법
- `frontend/.gitignore`: `.vercel`, `.env.local` (Vercel CLI 파일)

## 리스크/이슈
- `CORS_ORIGINS` 변수 이름 뒤 공백 때문에 설정이 읽히지 않아 CORS 400이 났다. 공백을 지우고 다시 배포해 풀렸다
- 지금까지 인식 속도·정확도 측정은 agy 기준이고 배포본은 Gemini API를 쓴다. 배포본 경로의 수치는 없다
- Render 무료 서버는 쓰지 않으면 잠든다. 공개된 backend는 그 Gemini 키의 한도를 쓴다

## 참고
- 관련 문서: README "배포", docs/specs/api.md, 이슈 #144
