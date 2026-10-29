# TODO - 따라 그린 사진 위에서 3D 전개도 접기

- 등록 일시: 2026-10-29 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#74](https://github.com/gaeun1961/foldy/issues/74) (작업 전 assignee 지정)
- 선행 TODO: TODO-35 (사진 위에 전개도 따라 그리기, [리포트](../reports/T35-photo-trace.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 사진 위에 따라 그린 전개도를, 3D에서도 그 사진 위에 올려 그 자리에서 접히게 한다 (AR 느낌. 실시간 카메라는 아님)
- 따라 그릴 때 사진과 칸의 위치를 이미 맞췄으므로 LLM이 사진 속 위치를 찾을 필요가 없다

## 완료 조건
- [ ] 전개도 그리기의 사진 위치(`ManualInput.tsx`의 `PhotoFit`: 옮김·크기·방향)를 뷰어까지 넘긴다. ViewerProps 변경이면 `docs/specs/viewer.md`부터 고친다
- [ ] 뷰어가 사진을 바닥에 텍스처로 깔고, 칸 1개 = 3D 길이 1로 전개도와 겹친다
- [ ] 접으면 사진 위에서 그대로 일어서 접히고, 화면을 돌려도 사진이 바닥에 붙어 있다
- [ ] 사진이 없거나 치수로 만든 도형이면 지금처럼 격자 바닥 위에 그린다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/viewer.md` "전개도 grid", `docs/reports/T35-photo-trace.md`
- 참고 화면: three.js로 교과서 위에 모형을 올린 예 (https://iamtechartist.com/every-joule/)
