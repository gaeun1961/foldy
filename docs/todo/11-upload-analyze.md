# TODO - 사진 업로드 → /analyze 호출 → 뷰어 반영 (목 데이터 제거)

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: UI·통합
- 이슈: [#17](https://github.com/gaeun1961/foldy/issues/17) (작업 전 assignee 지정)
- 선행 TODO: 없음

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학습지 사진을 올리면 backend가 돌려준 ShapeScene으로 뷰어를 그린다

## 완료 조건
- [ ] 사진을 고르면 `/analyze`를 호출하고, 로딩 중과 에러를 화면에 보여준다. 에러면 수동 입력(TODO-12)으로 안내한다
- [ ] 업로드 전에는 빈 상태 안내를 보여준다
- [ ] `frontend/src/shared/mock.ts`를 지우고 backend 응답만 쓴다. `docs/specs/stack.md`의 목 데이터 문구를 맞춘다
- [ ] backend 주소는 한 곳에서만 정의한다

## 참고
- 관련 문서: `docs/specs/api.md`
