# 제안 - 아크릴 피라미드 홀로그램

> **제안 문서입니다. 팀 합의 전이며 계약(`docs/specs/`)이 아닙니다.**
> 기획안(`docs/03-product-plan.md`)의 범위는 바꾸지 않았습니다. 팀이 받기로 하면 이슈를 만들고, 아래 "합칠 때"대로 옮깁니다.

- 일시: 2026-10-31 (KST)
- 작성자: Phodo
- 에이전트: Claude Code
- 브랜치: `feature/122-hologram-mode` (이슈 [#122](https://github.com/gaeun1961/foldy/issues/122) TODO-43, main `52e771d` 위)

| 문서 | 내용 |
|---|---|
| 이 문서 | 왜, 무엇을 바꿨나, 보는 법, 합칠 때 |
| [spec.md](spec.md) | 화면 명세: `HologramViewer` props, 화면 배치·반사 규칙, 움직임, 홀로그램 보기 UI |
| [api.md](api.md) | 다음 단계 초안: 노트북 조작을 휴대폰 홀로그램이 따라오는 연동 API (구현 안 함) |

## 왜

foldy는 어린 학생이 도형을 입체로 떠올리기 어려울 때 돕는 그림책이다. 화면 속 3D는 결국 평면이다. 휴대폰·태블릿 위에 아크릴 피라미드를 올리면 도형이 **허공에 떠서 접히는 모습**을 둘레에서 돌아가며 볼 수 있다. 앞에서는 앞면, 옆으로 가면 옆면이 보인다. 시연에서 눈길을 끌고, "입체로 본다"는 서비스 목적을 그대로 보여 준다.

참고: [HoloDisplay](https://github.com/kgabriel-dev/HoloDisplay) (MIT). 화면 배치(가운데 사각형 둘레 사다리꼴 4칸)와 아크릴 재단 방식만 참고했다. 코드는 옮기지 않았다. HoloDisplay는 정지 이미지·GIF를 회전해 붙이고, 우리는 카메라 4대로 실시간 3D를 그린다.

## 무엇을 바꿨나

책 화면 아래 바의 **"홀로그램"** 버튼(차례 옆)을 누르면 지금 만든 도형이 화면 전체 홀로그램으로 바뀐다. "돌아가기"를 누르면 책 화면이 그대로 돌아온다.

| 파일 | 변경 |
|---|---|
| `frontend/src/viewer/theme.ts` | 새 파일. 3D 디자인 토큰 `PAPER`(책 장면 지금 값) · `HOLOGRAM` |
| `frontend/src/viewer/stage.ts` | 새 파일. 무대: 장면 + 토큰 → 바닥에 놓인 도형 물체·접기·범위. 다면체·원기둥·원뿔·구 |
| `frontend/src/viewer/stage.test.ts` | 새 파일. 모든 도형 11가지 × 두 테마 검사 |
| `frontend/src/viewer/HologramViewer.tsx` | 새 파일. 홀로그램 화면: 무대를 카메라 4대로 비춰 사다리꼴 4칸에 붙인다 (도형을 모른다) |
| `frontend/src/viewer/holoLayout.ts` | 새 파일. 배치·반사 방향·크기 계산 (three.js 없음) |
| `frontend/src/viewer/holoLayout.test.ts` | 새 파일. 배치 계산 검사 |
| `frontend/src/ui/HologramMode.tsx` | 새 파일. 홀로그램 보기 (전체 화면, 설정 판, 돌아가기) |
| `frontend/src/viewer/ThreeViewer.tsx` · `CurvedViewer.tsx` · `curved.ts` · `lessons/sphereLessons.ts` | 23줄: 도형 색 숫자를 `PAPER` 토큰으로 (값이 같아 화면은 그대로). `buildCurvedNet`·`buildSphereBody`에 색 인자 추가 (기본값 `PAPER`) |
| `frontend/src/viewer/index.ts` | 2줄 추가: `HologramViewer`, `HologramProps`, `hologramSupported` export |
| `frontend/src/ui/App.tsx` | 12줄: `hologram` 상태, 홀로그램 버튼, `HologramMode`, 홀로그램 동안 책 장면 끄기 |
| `frontend/src/index.css` | 끝에 홀로그램 블록 추가 (기존 규칙은 그대로) |
| `frontend/package.json` | `npm test`에 `holoLayout.test.ts`, `stage.test.ts` 추가 |

- 바꾸지 않은 것: ShapeScene, `ViewerProps`, 책 장면의 동작·모양, 기존 CSS 규칙, backend, 기획안
- 구조는 [spec.md](spec.md) "구조: 무대와 카메라": 도형은 무대 하나, 디자인은 3D 토큰, 홀로그램은 카메라만
- 디자인: 버튼은 차례와 같은 `contents-button`, 설정 판은 `--panel`·`--panel-shadow`, 버튼은 `primary-button`·`secondary-button`·`menu-button`, 슬라이더는 `slider-row`. 새 색·그림자 토큰은 없다. 홀로그램 화면 자체는 아크릴에 비치도록 검은 배경이다
- 검증: `npm run build`, `npm run lint`, `npm test` 통과. PC 브라우저(1280×551)에서 버튼 → 홀로그램 → 설정 → 돌아가기, 직육면체·원기둥·원뿔·구 홀로그램, 책 화면(직육면체·원기둥·구) 그대로인지 확인. 콘솔 오류 없음

## 보는 법

```sh
cd frontend
npm run dev -- --host
```

- PC: `http://localhost:5173/`
- 휴대폰·태블릿: PC와 같은 와이파이에서 `http://{PC IP}:5173/` (`--host`로 띄우면 터미널에 Network 주소가 나온다)
- 휴대폰에서 안 열리면: Windows 방화벽이 "공용 네트워크"에서 Node.js 접속을 막는 경우가 많다. 믿을 수 있는 와이파이면 네트워크를 "개인"으로 바꾸거나, 방화벽에서 Node.js를 공용 네트워크에도 허용한다 (관리자 권한)
- 도형을 만들고 아래 바의 "홀로그램" → 기기를 눕히고 가운데 사각형 위에 아크릴 피라미드를 뒤집어 올린다

## 실물 확인할 것

- [ ] 위아래 방향 (도형이 바로 서 보이는지. 좌우는 도형이 대칭이라 따로 보지 않는다)
- [ ] 휴대폰·태블릿 각각 알맞은 "가운데"(피라미드 꼭지 크기)
- [ ] 모서리 굵기·면 투명도가 아크릴에서 잘 보이는지
- [ ] 좁은 화면(휴대폰 세로)에서 아래 바의 홀로그램 버튼 자리
- [ ] 아크릴 재단: 45° 사다리꼴, 아랫변 c, 윗변 L, 높이 (L − c)/2 × √2 (L = 화면 짧은 변, c = 가운데 사각형 한 변)

## 합칠 때

받기로 하면:

1. `[기능] 홀로그램 보기` 이슈를 만든다 (영역 라벨 `3d`·`ui`)
2. `spec.md`의 "뷰어" 절을 `docs/specs/viewer.md`에, "화면" 절을 `docs/specs/ui.md`에 옮긴다. `docs/01-folder-architecture.md`의 `viewer/`·`ui/` 파일 목록에 새 파일을 더한다
3. 기획안 `docs/03-product-plan.md` 핵심 기능에 한 줄 더한다
4. 이 브랜치를 그 이슈 번호의 브랜치로 옮겨 PR을 연다. 이 폴더(`docs/proposals/hologram/`)는 지우고 결정은 `docs/reports/T00-hologram.md`로 남긴다

`App.tsx` 변경이 작아서 그사이 화면이 바뀌어도 다시 붙이기 쉽다: 상태 한 줄, `<Viewer>` 조건에 `!hologram`, 차례 옆 버튼, `<ChatPanel>` 앞 `<HologramMode>`.

받지 않기로 하면 이 브랜치를 지우면 된다. main에는 아무것도 들어가지 않았다.
