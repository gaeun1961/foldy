# 인계 메모 - 학습지 사진을 홀로그램 면에 입혀 접기 (사진 세션에게)

- 일시: 2026-10-31 (KST)
- 보낸 쪽: 홀로그램 세션 (TODO-43, 이슈 [#122](https://github.com/gaeun1961/foldy/issues/122), 브랜치 `feature/122-hologram-mode`)
- 받는 쪽: 사진 촬영·업로드 세션 (모바일 웹, 내 학습지)
- 상태: 아이디어 인계. 이슈·TODO 없음. 시작은 아래 "언제"

## 무엇

학생이 찍은 학습지 사진을 전개도 면마다 입혀서, 홀로그램에서 **학생 자기 학습지가 허공에서 상자로 접히게** 한다. 홀로그램에서는 사진을 반전한다: 흰 종이는 투명(검정 = 아크릴에서 안 보임), 연필·인쇄 선은 밝게 빛난다.

## 언제

- 홀로그램 브랜치(`feature/122-hologram-mode`)가 main에 들어간 뒤. 지금은 로컬에만 있고 push 전이다 (같은 PC라 `git show feature/122-hologram-mode:<경로>`로 읽을 수 있다)
- 사진 쪽 원근 보정(M3)이 들어간 뒤면 더 좋다. 펴진 학습지 이미지가 가장 좋은 입력이다

## 홀로그램 쪽 구조 (알아야 할 것만)

명세: `docs/proposals/hologram/spec.md` "구조: 무대와 카메라"

- `viewer/theme.ts`: 3D 디자인 토큰. 책 장면 `PAPER`, 홀로그램 `HOLOGRAM`
- `viewer/stage.ts`: `buildStage(scene, theme) → Stage`. 다면체는 `polyhedronStage`가 `buildFaceTree`로 면 메시를 만든다. 면 메시 좌표는 **다 접은 입체 좌표**이고, 펼치면 pivot 회전으로 전개도가 된다
- `viewer/HologramViewer.tsx`: 무대를 카메라 4대로 비춘다. 도형을 모른다
- `ui/HologramMode.tsx`: 홀로그램 보기 (설정 판). 지금은 `scene`만 받는다

## 사진이 지금 어떻게 놓이나 (책 장면)

- `App.tsx`의 `photo`(이미지 주소)와 `fit`을 `netPhoto(photo, fit)`(`ui/manualScene.ts`)가 `NetPhoto = { src, x, y, size, angle }`로 바꾼다. grid 전개도일 때만
- `ThreeViewer.tsx`가 면 트리 루트(`tree.root`) 좌표에 평면 하나로 깐다: 위치 `(x, −y, 0)`, z축 회전 `−angle°`, 크기 `size × (가로세로 비율)`. 접어도 사진은 평면으로 남는다

## 제안하는 방법

1. **UV 계산 (three.js 없는 함수로 빼서 검사)**: 면마다 꼭짓점을 **다 펼친 상태(s = 1)의 루트 좌표**로 구하고, 위 사진 변환의 역변환으로 사진 좌표 (u, v)를 얻는다. 면 메시 geometry에 `uv`로 넣으면 접어도 사진 조각이 그 면을 따라간다
2. **무대에 사진 입력**: `buildStage(scene, theme, { photo?: NetPhoto })`. grid 전개도 + photo 가 있으면 면 재질에 텍스처. 토큰에 사진 표시 방식을 더한다: `PAPER`는 그대로, `HOLOGRAM`은 반전 + 어두운 곳을 투명하게 (셰이더 또는 캔버스로 미리 변환)
3. **홀로그램에 전달**: `HologramMode`·`HologramViewer`에 `photo?: NetPhoto` prop, `App.tsx`에서 `netPhoto(photo, fit)` 넘김 (grid일 때만)
4. **검사**: `stage.test.ts`에 사진 UV 경우 (펼친 면 꼭짓점 → 사진 모서리 좌표가 맞는지)

## 지킬 것

- ShapeScene·`ViewerProps`는 바꾸지 않는다. 바뀌는 계약은 `HologramProps`·`buildStage` 옵션뿐이고 `spec.md`에 먼저 적는다
- 겹치는 파일 조심: 홀로그램 세션은 당분간 `HologramMode.tsx`·`HologramViewer.tsx`·`holoLayout.ts`(맞춤 화면, QR)를 고친다. 사진 작업은 `stage.ts`의 사진 경로와 위 prop 한 줄 정도로 좁히면 충돌이 적다. 겹치면 홀로그램 세션(이슈 #122)과 먼저 맞춘다
- 십자형(cross) 전개도는 사진이 없다. grid 전개도만
