# 작업 기록 - 공용 렌더러로 뷰어 여러 개 띄우기 + 예시 도형 갤러리

- 일시: 2026-10-26 17:50 (KST)
- 작성자: kimdaeone
- 에이전트: Claude Code
- 작업 유형: 기능 추가 / 리팩터

## 요약
- 뷰어가 몇 개 있어도 `WebGLRenderer`와 캔버스는 하나다. three.js 예제 [webgl_multiple_elements](https://threejs.org/examples/#webgl_multiple_elements) 방식으로, 고정 캔버스 하나에 각 뷰어의 컨테이너 위치를 재서 `setViewport`·`setScissor`로 그 영역에만 그린다
- 업로드 패널 아래 "예시 도형" 썸네일 3개(직육면체 4×2×3, 정육면체 3, 직육면체 2×2×5)를 작은 뷰어로 보여주고, 누르면 그 도형이 3D 뷰에 올라간다. 사진·네트워크 없이 바로 써 볼 수 있는 경로다 (행사장 대비)
- `ViewerProps.interactive`(기본 `true`)를 더했다. 썸네일은 `false`라 스크롤을 가로채지 않는다

## 변경 범위
- 스펙: `viewer.md`에 "공용 렌더러" 규칙과 `interactive`, `ui.md` 화면 배치 2번에 예시 도형, `01-folder-architecture.md`에 새 파일 3개
- 뷰어: `sharedRenderer.ts`(새 파일, `addView`로 등록·해제), `ThreeViewer.tsx`는 렌더러를 만들지 않고 scene·camera를 등록만 한다. `OrbitControls`는 캔버스 대신 컨테이너에 붙인다
- UI: `ExampleGallery.tsx`(새 파일), `App.tsx`(도형을 state로, 썸네일을 누르면 바뀜), `index.css`
- 공용: `shared/examples.ts`(예시 도형 3개)

## 주요 변경 파일
- `frontend/src/viewer/sharedRenderer.ts`, `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/viewer/index.ts`
- `frontend/src/ui/ExampleGallery.tsx`, `frontend/src/ui/App.tsx`, `frontend/src/index.css`, `frontend/src/shared/examples.ts`
- `docs/specs/viewer.md`, `docs/specs/ui.md`, `docs/01-folder-architecture.md`

## 결정
- 캔버스는 `position: fixed`로 화면 전체에 깔고 `z-index: -1`, `pointer-events: none`으로 둔다. body 배경보다는 앞, 패널·배지 등 모든 내용보다는 뒤라서 배경이 없는 뷰어 컨테이너 자리에만 비친다. 상태 배지·단계 점처럼 뷰 위에 떠 있는 요소는 그대로 보인다
- 스크롤은 예제처럼 캔버스를 `translateY`로 따라 움직이지 않고, `fixed` 캔버스에 매 프레임 `getBoundingClientRect()`(뷰포트 기준)로 자리를 잰다. 화면 밖 뷰는 건너뛴다
- 뷰마다 `scene.background`가 있어서 `renderer.render`가 scissor 영역만 그 색으로 지우고 그린다. 프레임 시작에 scissor를 끄고 투명으로 한 번 지워서 뷰가 움직인 자리에 잔상이 남지 않게 했다
- 마지막 뷰가 빠지면 렌더러와 캔버스를 없앤다 (다시 등록되면 새로 만든다)
- 썸네일은 반쯤 접힌 모습(`unfold = 0.5`)이다. 카메라가 전개도 범위까지 담기 때문에 다 접으면 너무 작게 보이고, 다 펼치면 정육면체와 직육면체 구분이 어렵다
- `interactive`는 `controls.enabled`만 바꾼다. 바뀌어도 다시 만들지 않는다

## 확인 (npm run dev, Chrome)
- 캔버스 1개(`document.querySelectorAll('canvas').length === 1`)에 큰 뷰 1 + 썸네일 3이 그려진다
- 단계별 접기, 지금 접히는 면 강조, 그림자, 가려진 모서리 점선이 전과 같다
- 썸네일 클릭 → 상태 배지가 "정육면체 · 펼친 상태"로 바뀌고 뷰어가 다시 만들어진다
- 큰 뷰는 드래그로 돌아가고, 썸네일은 돌아가지 않는다
- 한 칸 배치(좁은 화면)를 강제해 스크롤하면 썸네일과 큰 뷰가 자기 자리를 따라온다. 콘솔 오류 없음

## 리스크/이슈
- `npm test`는 렌더링을 하지 않아서 공용 렌더러 동작은 화면으로만 확인했다
- 뷰어 컨테이너나 그 조상에 배경색을 넣으면 캔버스가 가려진다. `.viewer-canvas`, `.example-thumb`는 배경 없이 둔다
- 뷰가 많아지면(2차 정다면체 목록 등) 뷰마다 그림자 맵 2048²을 갖고 있어 메모리가 는다. 썸네일은 그림자를 끄는 옵션을 나중에 둘 수 있다
- PR #53(TODO-4, 면 위 선분)과 `ThreeViewer.tsx`를 같이 고친다. 이 PR은 렌더러 생성·루프·정리 부분만 바꿨으므로 충돌은 그 자리로 한정된다

## 다음 작업
- 시연용 문제가 정해지면(TODO-15) `examples.ts`를 그 문제로 바꾼다
- 2차 정다면체 목록(TODO-16)은 이 갤러리에 썸네일을 더하면 된다

## 참고
- 관련 문서: `docs/specs/viewer.md` "공용 렌더러", `docs/specs/ui.md` 화면 배치 2번
