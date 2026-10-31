# 2) Specs 목차

스펙은 주제별로 `docs/specs/`에 나눠 둡니다. **하는 작업에 맞는 파일만 읽습니다.**

| 파일 | 담는 내용 | 이런 작업이면 읽는다 |
|---|---|---|
| [specs/stack.md](specs/stack.md) | 기술 스택, 공통 구현 규칙 (LLM은 backend에서만, 수동 입력 경로, 뷰어 인터페이스, 목 데이터, CORS) | 의존성 추가, 새 폴더·모듈, frontend↔backend 경계를 건드릴 때 |
| [specs/shape-scene.md](specs/shape-scene.md) | ShapeScene 데이터 계약 (도형별 size, 꼭짓점 인덱스, 선 끝점, 전개도 좌표, 예시) | 도형 데이터를 만들거나 읽는 모든 작업 (AI 인식, 뷰어, 수동 입력). **계약 변경은 이슈 합의 후 이 파일부터** |
| [specs/viewer.md](specs/viewer.md) | three.js 뷰어 규칙 (좌표, 면 트리와 접기, 곡면 말기, 선, 꼭짓점 복사본, 맞닿는 모서리, 클릭) | `frontend/src/viewer/` 작업 (3D 뷰어 TODO) |
| [specs/api.md](specs/api.md) | backend API (`/health`, `/analyze`, `/chat`) | API를 부르거나 고칠 때 (AI, UI·통합 TODO) |
| [specs/ui.md](specs/ui.md) | 화면 구성, 조작 요소, 색·글씨 기준 (팀 시안 기준) | `frontend/src/ui/` 작업, 화면 디자인 |
| [specs/mobile.md](specs/mobile.md) | 모바일 웹 계획 (휴대폰 접속, 사진 줄이기·원근 보정·촬영 안내, 변경 지도, 합칠 때 규칙). 시기 미정 | 휴대폰 접속, 사진 올리기(`PhotoUpload.tsx`) 흐름, 좁은 화면 작업 |
