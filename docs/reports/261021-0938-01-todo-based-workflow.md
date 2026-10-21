# 작업 기록 - TODO 단위 운영 방식 전환 및 TODO 세분화

- 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 문서

## 요약
- 역할별 폴더 담당을 없애고, `00-todo-list.md`에서 TODO에 담당자를 적고 가져가는 방식으로 바꿨다
- TODO 5개를 반나절~하루 크기의 15개로 다시 나눴다 (3D 뷰어 6, AI 4, UI·통합 4, 발표 1). 바로 시작할 수 있는 항목은 #1, #7, #9, #11, #12, #13

## 변경 범위
- `AGENTS.md`: "담당 외 폴더 대규모 수정 금지"를 "담당자를 적고 시작, 담당자가 있는 TODO는 건드리지 않음"으로 교체. 체크리스트와 TODO 작성 규칙에 담당자·선행 TODO·크기 기준 추가. ShapeScene 계약 규칙은 그대로
- `docs/01-folder-architecture.md`: 담당 열을 지우고 폴더 책임만 남김
- `README.md`: 역할 분담 표 → 일하는 방식 안내
- `docs/todo/`: 기존 TODO 5개 삭제, 새 TODO 15개 추가, 목록을 영역별 표(🟢 바로 시작, 선행, 담당자)로 변경, 템플릿에 영역·담당자·선행 TODO·완료 조건 추가

## 주요 변경 파일
- `AGENTS.md`, `README.md`, `docs/01-folder-architecture.md`
- `docs/todo/00-todo-list.md`, `docs/todo/_template.md`, `docs/todo/01~15-*.md`

## 리스크/이슈
- #2 → #4 → 이번 PR 순으로 쌓여 있다. 이 순서대로 머지해야 한다

## 다음 작업
- 각자 🟢 항목 중 하나를 골라 담당자 칸에 이름을 적고 시작

## 참고
- 관련 문서: 이슈 #5, `docs/todo/00-todo-list.md`
