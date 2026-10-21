# AGENTS.md

사람 팀원과 코딩 에이전트 모두 이 문서를 따른다.

## 프로젝트 개요

foldy: 학습지 사진 → 입체도형·전개도 3D 표시, 접는 과정과 면 위 선 위치 시각화, 화면을 조작하며 힌트를 주는 챗봇.
1차 범위는 직육면체·정육면체. 여유가 생기면 각기둥·원기둥.

- frontend: Vite + React + TypeScript, 3D는 three.js (뷰어는 `ViewerProps` 뒤에 숨겨 GeoGebra로 교체 가능)
- backend: FastAPI. 모든 LLM 호출은 backend에서 한다
- 사진 인식 실패 시 사용자가 도형·치수를 직접 입력하는 수동 경로가 반드시 있어야 한다

## 폴더 구조와 담당

```
frontend/src/viewer/   3D 뷰어          (3D 담당)  — index.ts 의 ViewerProps 가 UI와의 경계
frontend/src/ui/       화면·통합        (UI 담당)
frontend/src/shared/   공용 타입, 목 데이터 (공동, 변경은 합의)
backend/app/ai/        사진 인식, 챗봇, ShapeScene 스키마 (AI 담당)
backend/app/api/       라우터           (UI·통합 담당)
docs/                  문서
```

## ShapeScene 계약 요약

`frontend/src/shared/types.ts` ↔ `backend/app/ai/schema.py`, 상세는 [docs/data-contract.md](docs/data-contract.md).

- `shape`: `"cuboid" | "cube"`
- `size`: `{ width, depth, height }`
- `vertexLabels`: 길이 8, 꼭짓점 0~3 아랫면(앞왼·앞오·뒤오·뒤왼), 4~7 은 그 바로 위
- `lines`: `{ from, to }`, 끝점은 `{ vertex }` 또는 `{ edge: [i, j], t }`
- `net`: `{ layout: "cross" }`

**계약 변경은 GitHub 이슈로 먼저 합의**하고, 두 파일과 docs를 같은 PR에서 함께 고친다.

## 명령어

```sh
# frontend
cd frontend
npm run dev      # 개발 서버
npm run build    # 타입 체크 + 빌드
npm run lint     # oxlint

# backend (가상환경 활성화 후)
cd backend
uvicorn app.main:app --reload --env-file .env
ruff check .
ruff format .
```

## Git 작업 방식

1. GitHub 이슈 먼저 생성: 제목 `[기능] ...` / `[버그] ...` 등, 본문 2~3줄
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

## 금지 사항

- `.env` 커밋 금지 (`.env.example` 만 커밋)
- frontend 에서 LLM API 직접 호출 금지 (키 노출). 반드시 backend 경유
- 담당 외 폴더 대규모 수정 금지. 필요하면 담당자와 이슈로 먼저 이야기
- `CLAUDE.md` 등 에이전트별 설정 파일을 따로 만들지 말고 이 문서를 고친다
