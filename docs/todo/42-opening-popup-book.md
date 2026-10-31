# TODO - 오프닝: 팝업북처럼 책이 펼쳐지고 도형이 날아올랐다가 페이지 속으로

- 등록 일시: 2026-10-31 13:44 (KST)
- 작성자: HandoA01
- 에이전트: Claude Code
- 영역: 3D 뷰어 / UI·통합
- 이슈: [#120](https://github.com/gaeun1961/foldy/issues/120)
- 선행 TODO: 없음

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 처음 들어왔을 때 팝업북 같은 오프닝을 보여 주고, 끝나면 지금의 빈 책 화면(`EmptyBook`)으로 자연스럽게 이어진다

## 완료 조건
- [x] 1. 닫힌 책: 책상 위에 닫힌 책(지금 책 장면과 같은 표지·책상·매트)이 놓여 있다가 표지가 열리며 펼쳐진다
- [x] 2. 팝업: 펼쳐지면서 안에 있던 도형들(정육면체, 각기둥, 각뿔, 정다면체 등 이미 만들 수 있는 도형)이 페이지에서 공중으로 떠올라 둥실 날아다닌다
- [x] 3. 페이지 넘기기: 페이지가 넘어가면서 떠 있던 도형들이 페이지 속으로 빨려 들어간다 (레퍼런스: [KOKUYO Turn the page](https://www.awwwards.com/inspiration/turn-the-page-kokuyo))
- [x] 4. 다 넘어가면 지금의 빈 책(왼쪽 사용법, 오른쪽 차례)이 같은 카메라·같은 책 위치로 이어진다 (화면이 튀지 않게)
- [x] 건너뛰기: 오른쪽 아래 "건너뛰기" 버튼으로 바로 빈 책으로 간다 (화면 누르기는 책을 돌리려는 것과 헷갈려서 넣지 않음). `prefers-reduced-motion`이면 오프닝을 건너뛴다
- [x] 오프닝 중에는 만들기 카드·아래 바를 숨기거나 누를 수 없게 하고, 끝나면 보인다
- [x] 앱을 열 때 한 번 (`sessionStorage`: 새로고침은 다시 안 보임, 탭·창을 다시 열면 보임. 사용자 결정). `?opening`이면 다시 본다(시연용)
- [x] 이미지 파일 없이 three.js 상자·평면·캔버스 텍스처로 만든다 (지금 책 장면과 같은 방식). 떠오르는 도형은 three.js 기본 도형으로 충분해서 `polyhedra.ts`는 쓰지 않았다
- [ ] 실제 그래픽 카드에서 속도·느낌 확인 (headless 소프트웨어 렌더러로만 확인함)
- [ ] **PR 전에** `App.tsx`의 임시 `OPENING_ALWAYS`(새로고침마다 오프닝)를 지운다. 머지되는 동작은 위 `sessionStorage` 규칙
- [x] 문서: `viewer.md`에 "오프닝" 절(단계·시간·`index.ts` export), `ui.md`에 화면 흐름, `01-folder-architecture.md` B표에 새 파일

## 참고
- 관련 문서: `docs/specs/viewer.md` "책 장면"·"빈 책", `docs/specs/ui.md`, `frontend/src/viewer/bookScene.ts`, `frontend/src/viewer/EmptyBook.tsx`
- `ui` → `viewer`는 `viewer/index.ts`를 통해서만 import한다 (01 C)
