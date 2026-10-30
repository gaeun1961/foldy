# 작업 기록 - 공용 렌더러·예시 도형 갤러리 닫기 (TODO-35 정리)

- 일시: 2026-10-30 (KST)
- 작성자: kimdaeone
- 에이전트: Claude Code (예약 실행)
- 작업 유형: 정리 (구현 없음, 결정 기록)

## 요약
- TODO-35(이슈 #54, "공용 렌더러로 뷰어 여러 개 띄우기 + 예시 도형 갤러리")의 PR [#56](https://github.com/gaeun1961/foldy/pull/56)은 **머지하지 않고 닫았다** (사용자 확정 결정). 브랜치 `feature/54-shared-renderer`는 참고용으로 지우지 않고 둔다
- 이 문서로 TODO-35를 끝내고 `00-todo-list.md` "진행 중"에서 뺐다

## 결정과 이유
- **예시 도형 갤러리가 하던 일은 빈 책 "차례"가 이미 한다**: 갤러리의 목적은 사진 없이 바로 도형을 써 보는 길이었다. PR #56 이후 main 에 들어온 빈 책(#90)은 도형이 없을 때 차례(직육면체 ~ 각뿔)를 보여 주고, 누르면 그 도형이 바로 펼쳐진다. 같은 길이 두 개면 헷갈린다
- **지금 화면에는 뷰어를 여러 개 동시에 띄울 곳이 없다**: 화면은 3D 책 장면 하나가 화면을 채우고 패널이 위에 뜨는 구성(TODO-14)이다. 썸네일 뷰어가 없으니 WebGL 컨텍스트 한도를 피하려는 공용 렌더러(`sharedRenderer.ts`, `ViewerProps.interactive`)도 필요 없다
- PR #56 은 이후 바뀐 `ThreeViewer.tsx`·`App.tsx`(책 장면, 설명 모드, 사진 따라 그리기 등)와 크게 어긋나 있어서, 살리려면 거의 새로 써야 한다

## 변경 범위
- `docs/todo/00-todo-list.md`: "진행 중"에서 TODO-35 줄을 뺐다
- 이 리포트. 코드 변경 없음 (`ViewerProps`도 그대로)

## 리스크/이슈
- 없음. PR #56 의 `docs/reports/T35-shared-renderer-gallery.md`는 main 에 들어오지 않았으므로, 그때의 구현 기록은 PR #56 브랜치에서 본다

## 다음 작업 (필요해지면)
- 한 화면에 뷰어를 여러 개 띄울 일(예: 전개도 모양 여러 개 나란히 비교, 발표용 갤러리)이 생기면, 최신 main 위에서 `viewer/sharedRenderer.ts`만 다시 만든다. 방법은 three.js 예제 webgl_multiple_elements(렌더러 하나, `setViewport`·`setScissor`)이고, PR #56 브랜치를 참고한다. 그 전에 `docs/specs/viewer.md`에 `ViewerProps` 변경(`interactive` 등)부터 적는다

## 참고
- 관련 문서: PR #56, 이슈 #54, 빈 책 차례 #90, `docs/specs/ui.md` 안내 문구 "도형 없음"
