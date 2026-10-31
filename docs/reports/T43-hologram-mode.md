# 작업 기록 - 홀로그램 모드 (휴대폰 + 아크릴 피라미드)

- 일시: 2026-10-31 (KST)
- 작성자: kimdaeone (Phodo)
- 에이전트: Claude Code
- 작업 유형: 기능 추가 (TODO-43, 이슈 #122)

## 요약
- 아래 바 "홀로그램" 버튼(차례 옆)을 누르면 지금 도형이 화면 전체 4방향 홀로그램으로 바뀐다. 휴대폰·태블릿을 눕히고 아크릴 피라미드를 뒤집어 올리면 도형이 허공에서 돌며 접혔다 펴진다. 돌아가기로 책 화면이 그대로 돌아온다
- 도형별로 만들지 않았다. **무대**(`viewer/stage.ts`, 장면 + 토큰 → 바닥에 놓인 도형·접기·범위)와 **3D 디자인 토큰**(`viewer/theme.ts`, 책 `PAPER`·홀로그램 `HOLOGRAM`)으로 나누고, 홀로그램(`HologramViewer`)은 무대를 카메라 4대로 비추기만 한다. 다면체·학습지 grid 전개도·원기둥·원뿔·구·회전체가 모두 된다
- 설정은 기기마다 다른 "가운데"(피라미드 꼭지 크기) 하나뿐이다
- 실제 휴대폰(노트북 핫스팟)과 실제 학습지 사진 인식 → 홀로그램까지 확인했다

## 변경 범위
- 새 파일: `viewer/theme.ts`, `viewer/stage.ts`, `viewer/stage.test.ts`, `viewer/HologramViewer.tsx`, `viewer/holoLayout.ts`, `viewer/holoLayout.test.ts`, `viewer/worksheetScenes.ts`, `ui/HologramMode.tsx`
- 기존 파일
  - `ThreeViewer.tsx`·`CurvedViewer.tsx`·`curved.ts`·`lessons/sphereLessons.ts`: 도형 색 숫자를 `PAPER` 토큰으로 (값이 같아 화면 그대로). `buildCurvedNet`·`buildSphereBody`에 색 인자 추가 (기본값 `PAPER`)
  - `viewer/index.ts` 2줄, `ui/App.tsx`(상태 한 줄, `<Viewer>` 조건에 `!hologram`, 차례 옆 버튼, `<HologramMode>`), `index.css` 끝에 홀로그램 블록, `package.json` `npm test`에 두 검사
- 바꾸지 않은 것: ShapeScene, `ViewerProps`, backend
- 문서: `specs/viewer.md` "홀로그램", `specs/ui.md` "홀로그램 보기", `01-folder-architecture.md`, `03-product-plan.md` 핵심 기능 5). 남은 초안: `proposals/hologram/api.md`(QR·수업 방 연동, 협의 중), `proposals/hologram/photo-handoff.md`(사진 입히기 인계, #130)

## 결정
- **이슈 없이 제안부터** (사용자): 기획안 범위 밖이라 실험 페이지 → 실제 화면 → 무대 순으로 만들어 보여 준 뒤, 팀원이 만든 #122(TODO-43)에 붙였다
- **무대와 카메라 분리** (사용자 동의): 도형이 늘면 무대만, 디자인이 바뀌면 토큰만 고친다. 책 장면이 무대를 쓰는 것은 뷰어 담당과 합의 후 (viewer.md "다음 단계")
- **두 테마**: 아크릴 반사에서 검은색은 투명이 되어 종이 테마(진한 모서리)는 선이 사라진다. 홀로그램은 밝은 굵은 선(`Line2`)·반투명 색 면
- **간소화** (사용자): 맞춤 화면(방향 글자), 높이, 좌우 반전, 놓을 자리·접기·돌기 켜고 끄기를 지웠다. 기기마다 다른 것은 피라미드 꼭지 크기뿐이다. 좌우 반전은 도형이 대칭이고 글자를 그리지 않아 틀려도 보이지 않는다
- **면 1개 학습지는 버튼 끔** (사용자): 전개도 고르기 문제는 면 1개로 인식된다. 버튼은 보이되 꺼진다. 모르는 도형도 같다
- **잘못 그린 전개도는 그대로** (사용자): 목적은 도형을 정확히 불러와 홀로그램으로 보이는 것. 닫히지 않는 모습 그대로 접힌다
- **새 도형 감시**: 이슈 자동 생성(GitHub Actions) 대신 `stage.test.ts`의 `ShapeKind` 기본 치수 표. 도형 종류가 늘면 타입 검사가 실패해 홀로그램 지원 여부를 같이 정한다 (Actions는 저장소 설정이라 팀 결정)
- **정답 도형은 프론트에 복사**: 프론트 테스트가 backend 파일을 읽지 않게 `answers.json`의 13개를 `worksheetScenes.ts`로 옮겼다
- **QR·수업 방은 분리**: 팀 협의 중. 합의되면 새 TODO로 만든다 (`proposals/hologram/api.md`)
- **사진 입히기는 사진 세션에** (사용자): 인계 메모를 남기고 사진 세션이 #130으로 받았다

## 해결한 기술 문제
- **범위 계산**: `Box3.expandByObject`는 기울어진 면의 상자를 다시 돌려 담아서 실제보다 크다. 펼친 전개도에 두께가 생기고 정팔면체가 바닥 아래로 내려가 보였다. 무대는 꼭짓점으로 재고(`boundsOf`), 인스턴스 관(곡면 선)은 조각마다 잰다. 다 접은 입체의 가장 낮은 곳을 y = 0에 둔다
- **넓은 전개도 잘림**: 원기둥처럼 넓은 전개도가 사다리꼴 안쪽 좁은 변에서 잘렸다. 펼칠수록 카메라가 물러나고 높이각을 올리고 보는 높이를 바닥으로 내린다
- **휴대폰 접속**: 와이파이가 공용 네트워크라 방화벽이 Node.js·Python 접속을 막았다. 노트북 모바일 핫스팟(192.168.137.1) + 포트 5173·5198·8000 같은 대역 허용 규칙 + Node.js 공용 차단 규칙 끄기 (사용자가 관리자 권한으로 실행)
- **정합성 검토 (머지 전)**: 순서가 없는 도형(정다면체·각뿔)에서 무대가 책 장면과 다른 방향으로 눕히고 접어 순서가 달랐다. 방향을 `bookScene.ts`의 `VIEW_DIR` 하나로 모으고 `stage.test`가 모든 다면체에서 책 장면 순서와 같은지 검사한다. 원기둥·원뿔·구 크기·선 굵기·자른 선 위치는 `curved.ts`(`roundSizeOf`·`curvedLineRadius`·`seamOf`)를 책 장면과 같이 쓴다. 홀로그램 화면 색은 `HOLOGRAM.screen` 토큰. 도형 종류를 하나 더하는 시험에서 `stage.test`의 표가 빌드를 막는 것을 확인했다. 실제로 머지 직전 main에 회전체(`revolution`)가 들어오자 이 표가 빌드를 막았고, 무대에 회전체(`buildRevolutionBody` + 꺾인 모서리 윤곽)를 더해 홀로그램도 지원한다 (평면도형 4가지 × 축에 붙임·띄움 검사)
- **사진 인식 CORS**: 시험 서버가 `/backend`를 8000으로 프록시해서 확인했다 (시험 전용, 커밋 안 함). 휴대폰 backend 주소는 사진 세션의 `VITE_API_URL`·`CORS_ORIGINS`가 맡는다

## 확인
- `npm run build`, `npm run lint`, `npm test` 통과. `npm test`에 `holoLayout.test.ts`(칸 배치·반사 방향·크기), `stage.test.ts`(모든 도형 종류 × 두 테마, 학습지 13개, 면 1개 불가, 토큰)
- PC 브라우저: 직육면체·원기둥·원뿔·구 홀로그램, 책 화면 그대로, 버튼 → 홀로그램 → 설정 → 돌아가기, 콘솔 오류 없음
- 휴대폰: 핫스팟으로 홀로그램 동작 확인 (사용자)
- 사진 경로: 사진 세션 브랜치와 로컬로 합친 시험 브랜치에서 팀 사진 29번 인식 → 직육면체 grid → 홀로그램 정상. 휴대폰 촬영도 "도형에 프레임을 씌우면 잘 잡힘" (사용자). 글자 인식(OCR)은 사진 세션에서 해결 중

## 리스크/이슈
- 실물 아크릴에서 위아래 방향·선 굵기·태블릿 가운데 크기는 일부만 확인했다
- `worksheetScenes.ts`는 `answers.json` 복사본이라 정답이 바뀌면 같이 맞춰야 한다
- Windows 모바일 핫스팟은 기기 8대까지. 한 반 전체는 정적 배포나 학교 와이파이가 필요하다
- 책 장면과 홀로그램이 같은 조립 함수·토큰을 쓰지만 책 장면은 아직 무대를 쓰지 않는다

## 다음 작업
- 팀 협의: QR로 바로 보기(도형을 주소 `#`에 압축, backend 없이), 수업 방(선생님이 방을 만들고 학생 홀로그램이 따라옴, 서버 중계 SSE). 초안 `proposals/hologram/api.md`
- 사진 입히기(#130, 사진 세션), 책 장면이 무대 쓰기·설명 모드 홀로그램(뷰어 담당과 합의)

## 참고
- 관련 문서: [viewer.md](../specs/viewer.md) "홀로그램", [ui.md](../specs/ui.md) "홀로그램 보기"
- [HoloDisplay](https://github.com/kgabriel-dev/HoloDisplay) (MIT): 화면 배치만 참고
- 피라미드 홀로그램 공간 시각화 훈련, 종이 접기 검사가 좋아짐 ([JOIV](https://joiv.org/index.php/joiv/article/view/61)). 중1 2주 사용, 대체로 긍정적이지만 사용 중 문제 보고 ([ICITE 2020](https://download.atlantis-press.com/proceedings/icite-20/125948718)). 소규모 연구라 "보고된 사례"로만 인용
- 수업 동기화 사례: [Gynzy](https://www.gynzy.com/en/blog/teach-in-real-time-with-live-lesson-synchronized-learning-across-devices), [Kira](https://support.kira-learning.com/en/articles/16041673-live-classroom-teach-in-sync-with-kira)
