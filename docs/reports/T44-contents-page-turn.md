# 작업 기록 - 차례에서 도형 고르면 페이지 넘기는 모션

- 일시: 2026-10-31 17:05 (KST)
- 작성자: HandoA01
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 빈 책 차례에서 도형 줄을 누르면 바로 도형 화면으로 바뀌던 것을, 오프닝(TODO-42)의 넘기는 종이 모션으로 쪽이 넘어간 뒤 도형 화면으로 이어지게 했다
- 차례의 앞 도형들을 한 장씩 지나 고른 도형에 닿는다. k번째 줄이면 k + 1장이 0.12초 간격으로 넘어간다 (직육면체 1장 1초 ~ 회전체 12장 2.3초). 장마다 지나가는 도형의 왼쪽 쪽(제목·치수·공식 메뉴·쪽 번호)과 오른쪽 쪽 번호를 찍는다. 예: 정사면체를 고르면 직육면체·정육면체 쪽이 지나간다
- 도형 화면으로 바뀔 때 튀는 것 세 가지를 없앴다
  - 글: 마지막 장 뒷면에 고른 도형의 왼쪽 쪽을 미리 찍는다 (App 이 도형 화면이 처음 그릴 값을 `pageOf`로 준다)
  - 각도: 도형 화면은 오른쪽으로 약 17° 돌아간 `VIEW_DIR`에서 본다. 넘어가는 동안 빈 책 카메라가 그 방향으로 돈다
  - 확대: 도형 화면은 전개도·입체 높이·왼쪽 글까지 담아 더 멀리서 본다. `fromContents`로 연 도형은 빈 책 구도(`wholeBookView`, 쪽 너비에 비례)에서 시작해 0.9초 동안 자기 구도로 다가간다(`bookGlide`)

## 변경 범위
- 3D 뷰어(빈 책, 다면체·곡면 화면 카메라), UI(차례에서 고를 때 넘길 쪽 내용), 명세(viewer.md "빈 책", props `fromContents`)

## 주요 변경 파일
- `frontend/src/viewer/opening.ts`: `buildPageTurn(book, size, spreads)` (오프닝의 `turningPage` 재사용)
- `frontend/src/viewer/EmptyBook.tsx`: 줄을 누르면 넘기기 → 다 넘어가면 `onPick`, 카메라를 `VIEW_DIR`로 돌림, `pageOf` prop
- `frontend/src/viewer/bookScene.ts`: `wholeBookView`(빈 책 구도), `bookGlide`(빈 책 구도에서 다가가기)
- `frontend/src/viewer/ThreeViewer.tsx`, `CurvedViewer.tsx`, `index.ts`: `fromContents`
- `frontend/src/ui/App.tsx`: 왼쪽 쪽 메뉴를 `pageMenuOf`로 빼서 넘길 쪽 내용과 도형 화면이 같은 값을 쓴다
- `docs/specs/viewer.md`, `docs/01-folder-architecture.md`

## 리스크/이슈
- 오른쪽 전개도는 다가가기가 시작될 때 한꺼번에 나타난다
- 빈 책(쪽 비율 1.3)과 도형 화면의 쪽 비율이 다르면 왼쪽 글 위치가 바뀌는 순간 조금 움직일 수 있다
- 로컬 기본 Node 가 20이면 `npm test`가 `.ts`를 못 읽는다. Node 22 로 돌리면 통과한다

## 다음 작업
- 뒤쪽 도형(회전체 2.3초)이 길게 느껴지면 장 수 상한이나 간격(`PAGE_TURN_GAP`)을 줄인다

## 참고
- 관련 문서: `docs/specs/viewer.md` "빈 책"·"오프닝", 리포트 T42
