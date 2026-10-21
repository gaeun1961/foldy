# TODO - 접기 애니메이션 + 슬라이더

- 등록 일시: 2026-10-21 09:38 (KST), 2026-10-21 11:35 TODO-1 결과(플랜 A)로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#9](https://github.com/gaeun1961/foldy/issues/9) (작업 전 assignee 지정)
- 선행 TODO: TODO-2 `02-face-split-render.md` ([#8](https://github.com/gaeun1961/foldy/issues/8))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 슬라이더로 직육면체(접힘)와 십자형 전개도(펼침) 사이를 오가며 접히는 과정을 보여준다

## 완료 조건
- [ ] GeoGebra `Net(box, s)`의 `s`를 화면의 슬라이더와 연결한다. **0 = 직육면체(접힘), 1 = 십자형 전개도(펼침)** (GeoGebra 기준)
- [ ] "펼치기/접기" 버튼으로 0↔1 애니메이션 (`requestAnimationFrame` + `api.setValue('s', …)`, lab 참고)
- [ ] 펼침 정도를 `ViewerProps`로 밖에서 넣을 수 있다 (챗봇 화면 조작 TODO-10에서 사용). props 변경은 `docs/02-specs.md`에 먼저 적는다

## 참고
- 관련 문서: `docs/02-specs.md` B(GeoGebra 규칙), C. 전개도 `cross`
- lab에서 확인: `api.setValue('s', v)`로 JS에서 바꿀 수 있고, `registerObjectUpdateListener('s', …)`로 변화를 받을 수 있다
