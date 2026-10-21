# 작업 기록 - Docs Architecture 적용

- 일시: 2026-10-21 09:16 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 문서

## 요약
- austin-docs-architecture ko 번들을 적용해 기준 문서를 `AGENTS.md` + `docs/01~03` + `docs/todo` + `docs/reports`로 정리했다. 코드 동작은 바뀌지 않았다

## 변경 범위
- 기존 `AGENTS.md`의 실행 명령어·Git 작업 방식·금지 사항을 템플릿 `AGENTS.md`에 합쳤고, 폴더 담당은 `01`, ShapeScene 요약은 `02`로 넘겼다
- `docs/data-contract.md`를 `docs/02-specs.md`로 옮기고(기술 스택·구현 규칙 추가) 원래 파일은 삭제했다. 이 파일을 가리키던 링크·주석도 모두 고쳤다
- 규칙 추가: PR 하나당 리포트 하나, ShapeScene 변경은 이슈 합의 후 `02-specs.md`부터 고친다
- TODO 5건 등록 (GeoGebra 선 연동 테스트, 비전 LLM, 접기 애니메이션, 선 긋기, 챗봇)

## 주요 변경 파일
- `AGENTS.md`, `README.md`
- `docs/01-folder-architecture.md`, `docs/02-specs.md`, `docs/03-product-plan.md`
- `docs/todo/00-todo-list.md`, `docs/todo/01~05-*.md`, `docs/todo/_template.md`, `docs/reports/_template.md`
- `frontend/src/shared/types.ts`, `backend/app/ai/schema.py` (주석 속 문서 경로만)

## 리스크/이슈
- 이 브랜치는 머지 전인 #2(`chore/1-project-setup`)에서 분기했다. #2를 먼저 머지해야 한다

## 다음 작업
- `docs/todo/01-geogebra-line-test.md`로 뷰어 플랜 A/B부터 정한다

## 참고
- 관련 문서: https://github.com/EunHyeokJung/austin-docs-architecture, 이슈 #3
