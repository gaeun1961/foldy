# TODO - 학습지 사진 10장 수집 + 비전 LLM 프롬프트로 ShapeScene 추출 테스트

- 등록 일시: 2026-10-21 09:38 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: AI
- 이슈: [#13](https://github.com/gaeun1961/foldy/issues/13) (작업 전 assignee 지정)
- 선행 TODO: 없음

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 실제 학습지 사진으로 비전 LLM이 ShapeScene을 얼마나 정확히 뽑는지 확인하고 쓸 만한 프롬프트를 만든다

## 완료 조건
- [ ] 직육면체·정육면체 학습지 사진 10장과 각 사진의 정답 ShapeScene을 준비했다 (저작권 있는 사진은 저장소에 올리지 않는다)
- [ ] 프롬프트를 `backend/app/ai/`에 파일로 두었다
- [ ] 사진별 결과(맞은 필드, 자주 틀리는 부분)와 사용한 모델을 `docs/reports/`에 기록했다

## 참고
- 관련 문서: `docs/02-specs.md` C. ShapeScene
