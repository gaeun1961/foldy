# TODO - 닮은 직육면체의 겉넓이비·부피비

- 등록 일시: 2026-10-21 17:00 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#45](https://github.com/gaeun1961/foldy/issues/45) (작업 전 assignee 지정)
- 선행 TODO: TODO-25 `25-cuboid-surface-area.md` ([#40](https://github.com/gaeun1961/foldy/issues/40)), TODO-26 `26-cuboid-volume.md` ([#41](https://github.com/gaeun1961/foldy/issues/41))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 크기를 k배로 하면 겉넓이는 k²배, 부피는 k³배가 되는 이유를 보여준다 (중학교 닮은 입체)

## 완료 조건
- [ ] 원래 직육면체와 k배(예: 2배, 3배) 직육면체를 나란히 놓고 k를 고를 수 있다
- [ ] 겉넓이: 원래 면 하나가 k배 직육면체의 면에 k × k 개 들어가는 모습을 보여준다 (TODO-25의 면 칠하기를 바탕으로)
- [ ] 부피: 원래 직육면체가 k배 직육면체에 k × k × k 개 쌓이는 모습을 보여준다 (TODO-26의 층 쌓기를 바탕으로)
- [ ] 멈춘 뒤 겉넓이비 1 : k², 부피비 1 : k³ 식을 보여준다
- [ ] ui.md 친절한 설명 원칙을 따른다

## 참고
- 관련 문서: `docs/specs/ui.md` (친절한 설명 원칙)
- 1차 다른 TODO보다 뒤 순위다
- 설계 참고 (2026-10-30 조사)
  - "길이가 2배면 부피도 2배"라는 선형성 착각이 아주 흔하다 (비례가 아닌 문항 정답률 12~13세 2~7%). 보기 전에 "모서리가 2배면 겉넓이는 몇 배?"를 비교형으로 먼저 고르게 하고, 결과와 부딪히게 한다. 넓이는 원래 면을 k×k장 깔고, 부피는 원래 입체를 k³개 채우는 "세기"로 보여준다. 장식적인 이야기 맥락은 오히려 역효과였다 — De Bock 외 (2003), *Learning and Instruction* 13, [KU Leuven](https://lirias.kuleuven.be/retrieve/c7bcb088-1d0f-4448-8fc2-0bd751dcfa00)
  - 부피가 넓이보다 더 어렵다. 부피 단계에 단계와 멈춤을 더 준다 — Pavlin-Bernardić & Mateša (2012), *Review of Psychology* 19(2), [hrcak](https://hrcak.srce.hr/en/100334)
  - 길이 k → 넓이 k² → 부피 k³을 한 흐름으로 이어 보이고 마지막에 나란히 놓는다. 마무리에 "모서리 길이의 합은 몇 배?"로 k²·k³ 과잉 일반화를 점검한다 — Svanteson Wester & Kullberg (2020), *NOMAD* 25(1), [tidsskrift.dk](https://tidsskrift.dk/NOMAD/article/view/149046)
  - 교육과정: 중학교 1~3학년군 '도형의 닮음'. 교과서 관행상 중2
