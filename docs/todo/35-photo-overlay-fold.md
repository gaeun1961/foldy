# TODO - 찍은 사진 위에 3D 전개도를 겹쳐 그 자리에서 접기

- 등록 일시: 2026-10-29 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어 / AI
- 이슈: [#70](https://github.com/gaeun1961/foldy/issues/70) (작업 전 assignee 지정)
- 선행 TODO: TODO-8 `08-analyze-vision-llm.md` ([#14](https://github.com/gaeun1961/foldy/issues/14))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학습지 문제를 찍으면, 그 사진 속 전개도 바로 위에 3D 전개도가 겹쳐 올라가 그 자리에서 접히는 모습을 보여준다 (AR 느낌. 실시간 카메라는 아님)

## 완료 조건
- [ ] 비전 인식이 사진 속 전개도 위치(전개도를 감싸는 네 귀퉁이, 사진 비율 좌표)도 돌려준다. ShapeScene 변경이면 계약 변경 규칙대로 이슈 → `shape-scene.md` → `types.ts`·`schema.py`
- [ ] 뷰어가 올린 사진을 바닥에 텍스처로 깔고, 사진 속 전개도와 3D 전개도의 위치·크기·방향을 맞춘다 (원근이 있으면 네 귀퉁이로 맞춤)
- [ ] 접으면 사진 위에서 그대로 일어서 접히고, 화면을 돌려도 사진이 바닥에 붙어 있다
- [ ] 사진 위치를 못 찾으면 지금처럼 격자 바닥 위에 그린다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/viewer.md` "전개도 grid", `docs/specs/shape-scene.md` "전개도 grid", `backend/app/ai/vision_prompt.py`
- 참고 화면: three.js로 교과서 위에 모형을 올린 예 (https://iamtechartist.com/every-joule/)
