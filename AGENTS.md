# AGENTS.md

모든 팀원과 코딩 에이전트(Claude Code, Codex, Copilot 등)의 공통 작업 합의서다. 프로젝트 소개와 실행 방법은 [README.md](README.md)에 있다.

## 읽기 안내

**항상 읽기** (세션 시작 시): 이 문서, [docs/01-folder-architecture.md](docs/01-folder-architecture.md), [docs/todo/00-todo-list.md](docs/todo/00-todo-list.md), 지금 작업하는 TODO 파일 하나

**필요할 때만 읽기**

| 이런 작업이면 | 이 문서 |
|---|---|
| 도형 데이터(ShapeScene)를 만들거나 읽음 | [docs/specs/shape-scene.md](docs/specs/shape-scene.md) |
| 3D 뷰어 (`frontend/src/viewer/`) | [docs/specs/viewer.md](docs/specs/viewer.md) |
| API 호출·수정 | [docs/specs/api.md](docs/specs/api.md) |
| 의존성, 새 모듈, frontend↔backend 경계 | [docs/specs/stack.md](docs/specs/stack.md) |
| 화면·디자인 (`frontend/src/ui/`) | [docs/specs/ui.md](docs/specs/ui.md) |
| 범위·대상 사용자 판단 | [docs/03-product-plan.md](docs/03-product-plan.md) |
| 어떤 spec이 있는지 모를 때 | [docs/02-specs.md](docs/02-specs.md) (목차) |

**기본으로 읽지 않기**: `docs/reports/`(지난 작업 기록), `docs/design/`(시안 이미지). 지난 결정의 이유나 시안이 필요할 때만 찾아본다.

## 작업 시작 체크리스트

- 할 TODO의 이슈에 자기 자신을 assignee로 지정했는가 (`gh issue edit N --add-assignee @me`). 이미 assignee가 있는 이슈는 아닌가
- 선행 TODO가 모두 끝났는가
- 우선순위를 지키는가: 1차(직육면체 완성) → 2차(정다면체) → 3차(원기둥·원뿔). 1차가 남아 있으면 2·3차를 먼저 가져가지 않는다
- 폴더 책임과 의존 규칙(01의 B, C)을 지키는가
- 요청과 관련된 다른 TODO가 있으면 먼저 사용자에게 알리고, 이번에 같이 할지 물어본 뒤 진행한다. 범위를 나눠 달라고 하면 그 TODO는 건드리지 않는다

## 핵심 규칙

- **ShapeScene 변경**: 이슈로 먼저 합의 → `docs/specs/shape-scene.md`부터 고침 → `types.ts`, `schema.py`, 목 데이터를 같은 PR에서 함께 고침
- **ViewerProps 변경**: `docs/specs/viewer.md`에 먼저 적는다
- **문서 먼저**: 작업이 문서와 다르면 문서부터 고친다. 이 문서와 01·specs·03이 충돌하면 01·specs·03이 우선이다
- 공통 구현 규칙(LLM 호출 위치, 수동 입력 경로, 뷰어 인터페이스, 목 데이터, 스타일링)은 [docs/specs/stack.md](docs/specs/stack.md)에 있다

## Git 흐름

1. 이슈: TODO 작업이면 그 `[TODO-N]` 이슈, 아니면 새 이슈(제목 `[기능]`/`[문서]`/`[버그]`/`[계약]` ..., 본문 2~3줄)
2. main에서 브랜치: `{타입}/{이슈번호}-{짧은-설명}` (예: TODO-3 → 이슈 #9 → `feature/9-fold-animation-slider`)
3. 커밋 메시지는 heredoc 멀티라인으로, 형식은 [.github/pull_request_template.md](.github/pull_request_template.md)를 따른다
4. PR 본문은 커밋 메시지와 같게 쓰고, 마지막 줄에 `Closes #{이슈번호}`를 넣는다 (머지되면 이슈가 닫힌다)
5. TODO 하나에 PR 하나. 수정사항은 같은 PR에 커밋을 추가한다. 작은 문서 수정은 별도 PR 없이 다음 TODO PR에 포함한다
6. 이전 PR이 머지된 뒤 다음 브랜치를 만든다

## 기록 규칙

- **리포트**: TODO 하나당 하나 (`docs/reports/{YYMMDD}-{HHMM}-T{TODO번호 두 자리}-{짧은설명}.md`, 템플릿 `docs/reports/_template.md`)
  - 같은 TODO에 PR이 여러 개면 기존 리포트에 이어서 쓴다
  - TODO가 아닌 작은 작업(문서 정리, 설정 변경)은 쓰지 않고 PR 본문으로 대신한다
  - 결정이 바뀌었거나 기술 문제를 해결했으면 TODO가 아니어도 `T00` 리포트를 쓴다
- **TODO 목록 갱신**: TODO를 가져가거나 끝낼 때 `00-todo-list.md`의 섹션(지금 시작 가능 / 진행 중 / 1차 남은 일)을 같이 갱신한다
- **2·3차 이슈**: 1차 마일스톤이 끝나면 다시 연다 (그전까지 "not planned"로 닫혀 있다)
- **TODO 추가**: 한 사람이 반나절~하루에 끝낼 크기로 만든다
  - 템플릿은 `docs/todo/_template.md`
  - `[TODO-N] 제목` 이슈를 영역 라벨(`3d`/`ai`/`ui`/`presentation`)과 해당 마일스톤으로 만들고, assignee는 비운다
  - `00-todo-list.md`의 맞는 섹션에 이슈 링크와 함께 한 줄을 넣는다
- **TODO 완료**: 같은 PR에서 TODO 파일을 지우고, 목록에서 빼고, 리포트를 쓴다

## 검증 (PR 전에)

```sh
cd frontend && npm run build && npm run lint && npm test
cd backend && ruff check . && ruff format --check . && python -m tests.test_schema
```

화면이 바뀌면 `npm run dev`로 띄워서 직접 확인한다.

## 금지 사항

- `.env` 커밋 금지 (`.env.example`만 커밋)
- frontend에서 LLM API 직접 호출 금지 (키 노출). 반드시 backend를 거친다
- assignee 없이 TODO 작업을 시작하거나, assignee가 있는 이슈를 건드리는 것 금지
- `CLAUDE.md` 등 에이전트별 설정 파일을 따로 만들지 않는다. 이 문서를 고친다
- 이 문서는 짧게 유지한다. 긴 설명은 해당 docs 문서에 쓰고 여기에는 경로만 남긴다
