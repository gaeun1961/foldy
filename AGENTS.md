# Agent Working Agreement

이 파일은 이 저장소에서 작업하는 모든 팀원과 코딩 에이전트(Claude Code, Codex, Copilot 등)를 위한 공통 합의서입니다.
어떤 에이전트를 쓰든 같은 기준으로 작업하는 것이 목표입니다.

foldy: 학습지 사진 → 입체도형·전개도 3D 표시, 접는 과정과 면 위 선 위치 시각화, 화면을 조작하며 힌트를 주는 챗봇.
frontend는 Vite + React + TypeScript + three.js, backend는 FastAPI.

## 반드시 읽기 (매 작업 전)
- `docs/01-folder-architecture.md`
- `docs/02-specs.md`
- `docs/03-product-plan.md`
- `docs/todo/00-todo-list.md`

## 작업 시작 체크리스트
- 위 필수 문서를 읽었는가
- `docs/todo/00-todo-list.md`를 확인했는가
- 작업이 1차 범위(직육면체·정육면체, 십자형 전개도)를 벗어나지 않는가
- 할 TODO의 담당자 칸(`docs/todo/00-todo-list.md`와 해당 TODO 파일)에 이름을 적었는가. 이미 담당자가 있는 TODO는 아닌가
- 선행 TODO가 모두 끝났는가
- 폴더 책임과 의존 규칙(`docs/01-folder-architecture.md` B, C)을 지키는가
- LLM 호출은 backend(`backend/app/ai/`)에서만 하는가
- UI/스타일링은 일반 CSS(`frontend/src/index.css`) 방식인가
- 현재 작업과 관련된 TODO가 있으면 해당 `docs/todo/*.md`를 읽고, 내용을 사용자에게 먼저 알린 뒤 이번 요청 범위에 함께 반영할지 확인했는가

## 코드 변경 규칙 (요약)
- ShapeScene 타입은 `frontend/src/shared/types.ts`, `backend/app/ai/schema.py`에만 정의하고 가져다 쓴다
- **ShapeScene 변경은 GitHub 이슈로 먼저 합의하고 `docs/02-specs.md`부터 고친다.** 그 뒤 `types.ts`, `schema.py`, 목 데이터(`mock.ts`, `vision.py`)를 같은 PR에서 함께 고친다
- UI는 `frontend/src/viewer/index.ts`의 `Viewer`, `ViewerProps`만 사용한다 (구현 파일 직접 import 금지)
- `backend/app/api/` 라우터는 얇게 두고, 로직은 `backend/app/ai/`에 둔다
- 사진 인식이 실패해도 수동 입력 경로가 동작해야 한다

## 명령어

```sh
# frontend
cd frontend
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입 체크 + 빌드
npm run lint     # oxlint

# backend (가상환경 활성화 후)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --env-file .env   # http://localhost:8000
ruff check .
ruff format .
```

## Git 작업 방식

1. GitHub 이슈 먼저 생성: 제목 `[기능] ...` / `[문서] ...` / `[버그] ...` 등, 본문 2~3줄
2. main 에서 브랜치: `{타입}/{이슈번호}-{짧은-설명}` (예: `chore/1-project-setup`, `feature/4-net-folding`)
3. 커밋 메시지는 heredoc 멀티라인, 아래 템플릿
4. PR 본문은 커밋 메시지와 동일하게, 마지막 줄에 `Closes #{이슈번호}`

```
{타입}: {요약}

## 어떤 기능인가요
- ...

## TODOS
- [x] 한 일
- [ ] 남은 일

## 참고자료
- ...

## 타입
- [ ] chore
- [ ] docs
- [ ] feature
- [ ] fix
- [ ] refactor
- [ ] remove
- [ ] test
- [ ] UI
```

타입은 해당하는 것만 `[x]`.

## 문서 업데이트 규칙
- 구조/스펙/기획 변경 시 해당 문서(01/02/03)를 반드시 업데이트
- 이번 작업이 문서 내용과 다르면 먼저 문서를 갱신한 뒤 코드 수정
- **리포트는 PR 하나당 짧게 하나.** `docs/reports`에 `yymmdd-HHMM-NN-작업키워드.md` 형식으로 기록
- 템플릿: `docs/reports/_template.md`
- 현재 바로 처리하지 못하지만 추후 반드시 진행해야 하는 작업이 생기면 `docs/todo`에 TODO 문서를 추가 (템플릿: `docs/todo/_template.md`)
- TODO 하나는 한 사람이 반나절~하루에 끝낼 크기로 나누고, 목표·완료 조건·선행 TODO·담당자 칸을 적는다
- TODO 추가 시 `docs/todo/00-todo-list.md`의 해당 영역 표에 한 줄도 반드시 함께 갱신 (선행 TODO가 없으면 🟢)
- TODO 완료 시 해당 TODO 파일을 삭제하고, `docs/reports/`에 작업 기록을 남긴 뒤, `docs/todo/00-todo-list.md`에서도 제거
- TODO와 관련된 요청을 받으면 우선 `docs/todo/00-todo-list.md`를 확인하고, 관련 항목이 있으면 해당 TODO 문서를 읽은 뒤 사용자에게 관련 TODO 존재 여부와 반영 범위를 먼저 알릴 것
- 관련 TODO가 현재 요청과 이어질 수 있으면, TODO 내용을 짧게 요약한 뒤 이번 작업에 함께 반영할지 사용자에게 먼저 물어보고 답변을 받은 후 진행할 것
- 사용자가 범위를 분리해 달라고 하면 현재 요청 범위만 처리하고, 관련 TODO는 건드리지 않을 것

## 금지 사항
- `.env` 커밋 금지 (`.env.example` 만 커밋)
- frontend 에서 LLM API 직접 호출 금지 (키 노출). 반드시 backend 경유
- 담당자 없이 작업 시작 금지. 작업 전 `docs/todo/00-todo-list.md`에서 해당 TODO에 담당자를 적고 시작한다. 담당자가 있는 TODO는 건드리지 않는다
- `CLAUDE.md` 등 에이전트별 설정 파일을 따로 만들지 말고 이 문서를 고친다

## 참고
- 이 문서는 에이전트용이므로 간결하게 유지
- 필요 시 여기에 규칙을 추가하되 01/02/03의 내용과 충돌하면 01/02/03을 우선
