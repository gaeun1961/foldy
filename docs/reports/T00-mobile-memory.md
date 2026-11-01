# 작업 기록 - 휴대폰 메모리 초과 (차례를 누르면 화면이 안 나옴)

- 일시: 2026-10-31 (KST)
- 작성자: HandoA01
- 에이전트: Claude Code
- 작업 유형: 버그 수정

## 요약
- 휴대폰(iOS Safari)에서 차례의 도형을 누르면 렉이 걸리고 화면이 안 나왔다. 원인은 메모리 초과
  - 쪽 텍스처 한 장이 2048×2662(캔버스 + GPU 약 50MB). 차례에서 k번째 도형을 누르면 지나가는 쪽을 2k+1장 한꺼번에 만든다 (마지막 도형은 1GB 넘음)
  - 오프닝 텍스처(5장 이상)를 오프닝이 끝난 뒤에도 차례 화면 내내 들고 있었다
  - 화면 해상도 배율 상한이 없어 아이폰(3배)은 9배 픽셀을 그렸고, 지운 WebGL 컨텍스트는 GC 전까지 남았다
- 터치 기기에서 해상도를 낮추고, 안 쓰는 텍스처·캔버스·컨텍스트를 바로 놓는다. PC 화면은 지나가는 쪽 해상도 말고는 그대로

## 변경 범위
- 터치 기기(`pointer: coarse`): 쪽 캔버스 배율 2 → 1, 그림자 지도 2048 → 1024, MSAA 끔
- 모든 기기: 화면 배율 2까지, 넘어가며 지나가는 쪽은 1/4 배율(`FLIP_SCALE`)이고 최대 4장(`MAX_SHEETS`, 각뿔부터 휴대폰에서 끊겨서), 오프닝이 끝나면 바로 dispose, 쪽 텍스처 dispose 시 캔버스 크기 0, 렌더러 지울 때 `forceContextLoss`
- 렌더러 설정이 뷰어 3곳에 반복돼서 `bookRenderer()` 하나로 모았다
- 차례 → 도형 화면 깜빡임: 새 WebGL 캔버스가 첫 프레임을 그리기 전(휴대폰은 셰이더·텍스처 준비가 길다)에 책상 색만 보였다. 차례 마지막 장면을 2D 캔버스로 떠서 stage 에 덮어 두고, 도형 화면 첫 프레임 뒤에 걷는다
  - 처음에는 차례 화면 cleanup 에서 떴는데, 그때는 컨테이너가 이미 떼어져 ResizeObserver 가 캔버스를 0×0 으로 줄여 drawImage 가 던졌다(갈색 화면만 남음). 또 React 가 캔버스를 뗀 뒤 effect 전까지 한 번 그려져 빈 틈이 남았다. 그래서 다 넘어간 프레임을 그린 직후, onPick 전에 뜬다 (모바일 에뮬레이션 headless Chrome 에서 DOM 변화를 기록해 확인)

## 주요 변경 파일
- `frontend/src/viewer/bookScene.ts`: `MOBILE`, `FLIP_SCALE`, `pageTexture`의 `scale` 인자, `bookRenderer()`, 그림자 지도 크기, `keepLastFrame`·`liftLastFrame`
- `frontend/src/viewer/opening.ts`: `buildPageTurn`이 마지막 두 쪽 말고는 `FLIP_SCALE`
- `frontend/src/viewer/EmptyBook.tsx`: 넘기는 종이 최대 4장(`MAX_SHEETS`), 오프닝이 끝나면 바로 dispose, 다 넘어간 프레임에서 `keepLastFrame`, 크기 0 이면 resize 안 함
- `frontend/src/viewer/ThreeViewer.tsx`, `CurvedViewer.tsx`: `bookRenderer()`, `forceContextLoss`, `liftLastFrame`
- `frontend/src/viewer/HologramViewer.tsx`: `forceContextLoss`
- `docs/specs/viewer.md`: "책 장면"에 해상도·메모리 항목

## 리스크/이슈
- 실제 휴대폰에서 확인이 필요하다 (`npm run dev -- --host`로 같은 와이파이에서 접속)
- 태블릿도 터치 기기라 낮은 해상도가 된다. 화면이 크면 쪽 글자가 조금 흐릴 수 있다

## 다음 작업
- 휴대폰에서도 여전히 무거우면: 가만히 있을 때 다시 그리지 않기(지금은 매 프레임 그림)

## 참고
- 관련 문서: docs/specs/viewer.md "책 장면"
- 이슈: #152
