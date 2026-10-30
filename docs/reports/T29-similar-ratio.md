# 작업 기록 - 닮은 직육면체의 겉넓이비·부피비

- 일시: 2026-10-30 18:40 (KST)
- 작성자: kimdaeone
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 설명 모드에 **닮음**(`'similar'`, 바로 세운 입체)을 더했다. 원래 직육면체 옆에 k배(2배·3배 고름) 직육면체 틀을 두고
  - ① 길이: k배 모서리에 원래 모서리 k개를 두 색 번갈아 이어 붙인다
  - ② 한 면: k배 앞면에 원래 앞면 k × k 장을 틈을 두고 한 장씩 깐다
  - ③ 부피: 원래 직육면체 k³ 개를 한 층씩 채운다 (층마다 한 단계라 단계는 2 + k)
- 멈춘 뒤 `겉넓이 1 : 2² = 1 : 4,  부피 1 : 2³ = 1 : 8`
- 안내: 시작 전 "모서리를 2배로 늘리면 겉넓이와 부피는 몇 배가 될까요?", 부피 직전 "한 면은 4배였어요. 부피는 몇 배일까요?", 끝난 뒤 "그럼 모서리 길이를 모두 더한 것은 몇 배일까요?"
- `Lesson`에 `scale?`(k, 기본 2)을 더했다. 바뀌면 설명 물체를 새로 만든다. 설명이 `bounds`를 주면 카메라가 원래 것과 k배를 함께 담는다

## 설계 근거 (조사 2026-10-30)
- "길이가 2배면 부피도 2배"라는 선형성 착각이 흔하다 (비례가 아닌 문항 정답률 12~13세 2~7%) → 보기 전에 몇 배인지 먼저 묻고, 넓이·부피를 계산 대신 깔고 채워서 세게 한다. 장식적인 이야기 맥락은 역효과라 넣지 않았다 — De Bock 외 (2003), *Learning and Instruction* 13, [KU Leuven](https://lirias.kuleuven.be/retrieve/c7bcb088-1d0f-4448-8fc2-0bd751dcfa00)
- 부피가 넓이보다 어렵다 → 부피는 층마다 단계와 멈춤을 준다 — Pavlin-Bernardić & Mateša (2012), *Review of Psychology* 19(2), [hrcak](https://hrcak.srce.hr/en/100334)
- 길이 → 넓이 → 부피를 한 흐름으로 보이고, 끝에 모서리 길이의 합을 물어 과잉 일반화를 점검한다 — Svanteson Wester & Kullberg (2020), *NOMAD* 25(1), [tidsskrift.dk](https://tidsskrift.dk/NOMAD/article/view/149046)
- 교육과정: 중학교 1~3학년군 '도형의 닮음'. 교과서 관행상 중2

## 변경 범위
- `viewer/lessons/`: `similarLayout.ts`(k배 배치·단계), `similar.ts`(three.js), `data.ts`(종류·`scale`·안내·단계·공식), `index.ts`(`bounds`, `scale` 인자)
- `ThreeViewer.tsx`: 설명을 종류 + 닮음비로 새로 만들고, `bounds`가 있으면 그 범위로 카메라를 맞춘다
- `ui/LessonControls.tsx`: 닮음일 때 "2배 / 3배"
- 문서: viewer.md(`lesson.scale`, 닮음, `bounds`, 안내), ui.md, 01 폴더 문서, TODO 목록

## 주요 변경 파일
- `frontend/src/viewer/lessons/similar.ts`, `similarLayout.ts`, `data.ts`, `lessons.test.ts`, `frontend/src/ui/LessonControls.tsx`

## 리스크/이슈
- 설명 종류 버튼이 6개라 닮음을 고르면 속도 버튼이 다음 줄로 내려가 아래 바가 한 줄 높아진다. 아래 바가 입체 아래쪽을 조금 가린다 (다른 입체 설명과 같은 문제, TODO-14 화면 정리 때 같이 보기)
- 3배는 k배 직육면체가 커서 원래 직육면체가 작게 보인다

## 다음 작업
- TODO-35 공용 렌더러 (#54): 세 설명을 마친 뒤 다시 보기로 한 일
- 설명 종류가 늘어서 설명 버튼을 접거나 묶는 방법 검토

## 참고
- 관련 문서: `docs/specs/viewer.md` "설명 모드", `docs/specs/ui.md` 화면 배치 8번
