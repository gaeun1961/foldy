# 작업 기록 - 피타고라스: 직육면체 대각선, 겉면 위 최단 거리

- 일시: 2026-10-30 15:40 (KST)
- 작성자: kimdaeone
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 설명 모드에 **대각선**(`'diagonal'`, 입체 자세)과 **최단 거리**(`'shortest-path'`, 전개도 자세) 두 종류를 더했다
- 대각선: ① 밑면 대각선(주황)이 자라고 직각삼각형·직각 표시 ② 밑면 대각선을 같은 색으로 둔 채 높이 모서리와 세운 직각삼각형 ③ 입체 대각선(파랑). 멈추면 `√(4² + 2² + 3²) = √29 = 약 5.39`
- 최단 거리: 꼭짓점 0 → 가장 먼 꼭짓점까지, 펼친 전개도에서 곧게 보이는 길 2개를 긴 길부터 하나씩 긋고, 길마다 직각삼각형의 두 변(모서리를 따라감)과 직각 표시를 보인다. 멈추면 `√((4 + 2)² + 3²) = √45 > √((3 + 2)² + 4²) = √41`
- 길 찾기는 선 긋기와 같은 `surfaceRoutes`를 쓴다. 길·변·직각 표시는 놓인 면 메시의 자식이라 접고 펼칠 때 면을 따라온다
- 시작 전 안내는 먼저 어림해 보게 묻는다: "밑면 대각선과 입체 대각선, 어느 쪽이 더 길까요?", "꼭짓점에서 반대쪽 꼭짓점까지, 어느 길이 더 짧을까요?"
- 상태 배지 조사를 받침에 맞게 고쳤다 ("대각선을 다 봤어요", 전에는 항상 "를")

## 설계 근거 (조사 2026-10-30)
- 겨냥도에서는 직각이 직각으로 안 보여서, 직각삼각형마다 직각 표시를 붙였다 — Fujita 외 (2020), *Mathematics Education Research Journal*, [doi:10.1007/s13394-020-00335-w](https://doi.org/10.1007/s13394-020-00335-w)
- "면을 적게 지나는 길이 짧다"는 직관과 다른 결과가 나오는 거미와 파리 문제, 전개도마다 직선 길이를 비교하는 과제 — [The spider and the fly problem](https://en.wikipedia.org/wiki/The_spider_and_the_fly_problem), [Teachoo: Shortest Paths on a Cube (NCERT 8학년)](https://www.teachoo.com/27839/5875/Question-1---Page-87/category/Shortest-Paths-on-a-Cube)
- 길이는 마지막에 함께 보이고(공식은 멈춘 뒤에), 보기 전에 어림 질문 — 위 두 자료와 ui.md 친절한 설명 원칙

## 변경 범위
- `viewer/lessons/`: `pythagorasLayout.ts`(계산), `pythagoras.ts`(three.js), `data.ts`(종류·자세·안내·단계 수·공식), `index.ts`(`buildLesson`에 `tree` 인자)
- `ThreeViewer.tsx`: `buildLesson`에 `tree` 전달 한 줄
- `ui/lessonStatus.ts`: 을/를
- 문서: viewer.md(설명 모드 두 종류), ui.md(설명 버튼·안내), 01 폴더 문서, TODO 목록. TODO-28·29 파일에 조사한 설계 참고를 더했다

## 주요 변경 파일
- `frontend/src/viewer/lessons/pythagorasLayout.ts`, `pythagoras.ts`, `data.ts`, `lessons.test.ts`

## 리스크/이슈
- 최단 거리의 두 점은 꼭짓점 0과 가장 먼 꼭짓점으로 정해져 있다. 학생이 고른 두 점의 최단 거리는 기존 선 긋기("다른 길")가 보여준다
- 곧게 보이는 길만 고르므로 전개도 모양(`cross` 외 grid)에 따라 후보 수가 달라진다. 후보가 없으면 단계 수가 0이라 "최단 거리" 버튼이 보이지 않는다
- 직육면체 4×2×3에서 세 번째 후보(√53)는 cross 전개도에서 곧게 보이지 않아 빠진다

## 다음 작업
- 조사에서 나온 것 중 이번에 못 한 것: 직각삼각형이 정면으로 보이게 카메라 돌리기, 최단 거리 선을 그은 채 다시 접어 "펼치면 곧은 선이 입체에서는 꺾인다" 보여주기
- TODO-28 위치 관계 (#44)

## 참고
- 관련 문서: `docs/specs/viewer.md` "설명 모드", `docs/specs/ui.md` 화면 배치 8번
