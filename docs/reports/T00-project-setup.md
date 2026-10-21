# 작업 기록 - 프로젝트 운영 체계 구성 (문서 구조, TODO·이슈 운영, 문서 다이어트)

- 일시: 2026-10-21 09:16 ~ 13:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 문서 / 운영 방식
- 관련 이슈·PR: #3·#4(Docs Architecture), #5·#6(TODO 운영 방식), #31·#33(문서 읽기 범위·UI 기준)

> 원래 리포트 세 개(`261021-0916-01-docs-architecture.md`, `261021-0938-01-todo-based-workflow.md`, `261021-1300-01-docs-diet-ui.md`)를 요약해서 합쳤다.

## 요약
- **문서 구조 (#4)**: austin-docs-architecture ko 번들을 적용했다. 기준 문서는 `AGENTS.md` + `docs/01~03` + `docs/todo` + `docs/reports`이다. 기존 AGENTS.md의 명령어·Git 작업 방식·금지 사항은 합쳤다. `docs/data-contract.md`는 `docs/02-specs.md`로 옮겼다. CLAUDE.md는 만들지 않았다
- **TODO 운영 (#6)**: 역할별 폴더 담당을 없애고, TODO 단위로 일을 가져가게 했다
  - TODO 5개를 반나절~하루 크기의 15개로 나눴다 (3D 6, AI 4, UI 4, 발표 1)
  - TODO마다 `[TODO-N]` 이슈(#7~#21)와 영역 라벨(`3d`/`ai`/`ui`/`presentation`)을 만들었다
  - 담당자는 문서에 이름을 적지 않고 이슈 assignee로 관리한다. 문서에 적으면 머지 전까지 다른 사람에게 안 보이기 때문이다
  - 표기는 TODO 번호 `TODO-N`, 이슈 번호 `#N`으로 나눴다
- **문서 다이어트와 UI 기준 (#33)**: 세션마다 반드시 읽는 문서를 526줄에서 약 231줄로 줄였다
  - 전: AGENTS 108, 01, 02, 03, todo 목록
  - 후: AGENTS 69, 01, todo 목록, 지금 TODO 하나
  - `02-specs.md`를 `docs/specs/{stack, shape-scene, viewer, api, ui}.md`로 나누고, 02는 목차만 남겼다
  - 커밋·PR 템플릿은 `.github/pull_request_template.md`로 옮겼다
  - 팀 시안 스크린샷(`docs/design/`)을 기준으로 `specs/ui.md`를 썼다
  - TODO-12는 드롭다운 + 슬라이더로 바꾸고, TODO-14에 ui.md 기준을 넣었고, TODO-22(맞닿는 모서리 색칠, #32)를 추가했다

## 결정 사항
- 쌓인 PR은 squash가 아닌 일반 merge commit으로 머지한다. base 브랜치를 지우면 다음 PR이 닫히므로, 다음 PR의 base를 main으로 먼저 바꾼 뒤 머지한다 (#4가 한 번 닫혔다가 다시 열린 일이 있었다)
- UI 시안 중 가져갈 것과 바꿀 것을 정했다
  - 면은 흰색·연한 회색으로 두고 색은 맞닿는 모서리에만 쓴다
  - 꼭짓점 라벨을 기본으로 보여준다
  - 배치는 cross를 따른다
  - 색만으로 구분하지 않게 짝 모서리를 함께 강조한다
- 수동 입력으로 처음부터 만든 도형은 기본 라벨 ㄱ~ㅇ을 채운다

## 참고
- 템플릿 원본: https://github.com/EunHyeokJung/austin-docs-architecture
- 관련 문서: `AGENTS.md`, `docs/02-specs.md`, `docs/specs/ui.md`, `docs/todo/00-todo-list.md`
