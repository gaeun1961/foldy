# TODO - 사진 업로드 → /analyze 호출 → 뷰어 반영 (목 데이터 제거)

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: UI·통합
- 담당자:
- 선행 TODO: 없음

> 시작 전에 `docs/todo/00-todo-list.md`와 이 파일의 담당자 칸에 이름을 적습니다.
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학습지 사진을 올리면 backend가 돌려준 ShapeScene으로 뷰어를 그린다

## 완료 조건
- [ ] 사진을 고르면 `/analyze`를 호출하고, 로딩 중과 에러를 화면에 보여준다. 에러면 수동 입력(#12)으로 안내한다
- [ ] 업로드 전에는 빈 상태 안내를 보여준다
- [ ] `frontend/src/shared/mock.ts`를 지우고 backend 응답만 쓴다. `docs/02-specs.md` B의 목 데이터 문구를 맞춘다
- [ ] backend 주소는 한 곳에서만 정의한다

## 참고
- 관련 문서: `docs/02-specs.md` D. API
