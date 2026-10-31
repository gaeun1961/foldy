# 내 학습지 (보관함 · 팀 테스트용 인식 엔진 · 문제 글 · 홀로그램 사진)

[mobile.md](mobile.md) 다음 단계의 계획과 명세입니다. **상태: 구현 (2026-10-31, 브랜치 `feature/worksheets`, push 전)**. 이슈 [#127](https://github.com/gaeun1961/foldy/issues/127)(기능), [#125](https://github.com/gaeun1961/foldy/issues/125)(계약 problem·photoBox), [#130](https://github.com/gaeun1961/foldy/issues/130)(홀로그램 사진). 팀원 작업과 겹치지 않게 경계·변경 지도를 먼저 정한다.

- 결정 (사용자, 2026-10-31)
  - 사진 인식은 API 비용이 커서 **팀 테스트에서는 Antigravity CLI(`agy`)로** 읽는다. 학생이 쓰는 배포 서버에서는 켜지 않는다
  - 찍은 학습지를 다시 볼 수 있게 **보관함**을 둔다. 책의 "차례"(예시 도형)와 따로
- **바꾸지 않는 것**: ShapeScene 계약, `/analyze`·`/chat` 요청·응답, `ViewerProps`, `PhotoUpload`의 Props, **`App.tsx`**(10/28 이후 수정 21건 중 팀원 17건, 겹침이 가장 높다)

---

## 통합 작업 계획 (2026-10-31, 우리 작업 + 홀로그램 세션 인계)

**목표**: 학생이 찍은 학습지가 ① 정확히 읽히고 ② 사진과 전개도가 딱 겹치고 ③ 문제 글까지 책에 나오고 ④ 보관함에 남고 ⑤ 홀로그램에서도 자기 학습지로 접힌다.

| 단계 | 작업 | 내용 | 선행 | 고치는 곳 | 확인 지점 (사용자) |
|---|---|---|---|---|---|
| **P0 정리** | 모바일 PR | `feature/mobile-web`(M1~M5) push·PR. 원격 main(#123)을 `feature/worksheets`에 합치기 | 사용자 결정 | - | PR 확인 |
| **P1 사진 놓기** ✅ | W5 사진 돌리기 | 네모 단계 "돌리기 ↻ 90°", 돌린 사진이 기준 사진 ([B2](../todo/B2-photo-overlay-rotated.md) 해결) | 없음 | `PhotoUpload.tsx`, `photoPrep.ts` | ① 3-2를 돌려 읽으면 칸 밑 사진과 전개도가 같은 방향 |
| | W4 대기·비교 화면 | 읽는 중 표시와 지난 초, 결과가 오면 사진과 인식한 전개도를 나란히 (틀린 인식을 사람이 알아채게, W0 3-2 low 사례) | W5 | `PhotoUpload.tsx`, `index.css` | ① 같이 |
| **P2 계약 묶음** ✅ (팀 합의 전) | W7 문제 글 + W8 사진 자동 맞춤 | ShapeScene 선택 항목 `problem?: string`(인쇄된 문제 문장), `photoBox?: {x,y,w,h}`(사진에서 전개도가 있는 곳, 0~1). **`[계약]` 이슈 하나로 팀 합의 → shape-scene.md → types.ts·schema.py·프롬프트 한 PR**. 문제 글은 책 왼쪽 쪽(`pageText`) 제목 아래, 챗봇 프롬프트에도. "사진 전체 읽기"도 `photoBox`로 칸 밑 사진을 자동으로 맞춘다(`fitToBox` 재사용) | 팀 합의 | backend `ai/`, `shared/types.ts`, `App.tsx` 몇 줄 | ② 29번·3-2: 왼쪽 쪽에 문제 글, 사진과 전개도가 저절로 겹침 |
| **P3 보관함** ✅ | W3 | 기기 안 저장(문제 글·맞춤 포함), 다시 열기·이름·지우기 | P2 (저장할 모양이 정해진 뒤) | `worksheetStore.ts`·`WorksheetShelf.tsx` 새로, `PhotoUpload.tsx` | ③ 저장했다 다시 열기 |
| **P4 홀로그램 사진** ✅ | W6 (인계) | 면마다 사진 UV → `buildStage(scene, theme, { photo })`, 홀로그램은 반전·어두운 곳 투명 | #122 머지, P1·P2 (사진이 전개도와 겹쳐야 면에 맞게 입혀짐) | `viewer/stage.ts` 사진 경로, `HologramMode` prop 한 줄, `App.tsx` 한 줄 | ④ 홀로그램에서 자기 학습지가 접힘 |
| **언제든** | W2 모델 비교 | `vision_eval --engine agy --model …` (계정 사용량) | W1 (끝남) | backend `evals/` | 숫자 표 |
| **넘김** | [B1](../todo/B1-viewer-wheel-zoom.md) | 3D 휠 거리 제한 | - | `viewer/` (프론트 담당) | - |

**진행 (2026-10-31)**: P0 원격 main 합침(#123). P1 끝 — 돌리기는 ↺·↻ 두 버튼(3-2는 ↺ 한 번), 읽는 동안 빛·지난 초, 인식한 전개도 그림(`ui/NetPreview.tsx`). 3-2를 돌려 읽으니 계단형·면 글자 맞음(약 1분). 남은 것: 모든 면이 인쇄 색이면 `fill`로 읽음(프롬프트, W2), 전체 읽기 사진 맞춤은 W8

P2 끝 (팀 합의 전 구현) — 3-2: ↺ 돌린 뒤 전체 읽기(약 70초) → 왼쪽 쪽에 문제 글, `photoBox`로 칸 밑·책 페이지 사진이 전개도와 정확히 겹침, `fill` 없음(프롬프트 고침). 남은 것: 사진을 키우면 3D가 뿌예짐 → [B3](../todo/B3-viewer-fog-with-photo.md)

P3 끝 — 읽기 성공 시 자동 저장, 새로고침 뒤 "내 학습지"에서 열면 `/analyze` 0번으로 같은 3D·문제 글·사진 위치. 이름 바꾸기·지우기는 화면 안에서(브라우저 확인창 없음)

P4 준비 — #122가 아직 머지 전(로컬에서 계속 고치는 중)이라 `stage.ts`는 건드리지 않았다. 충돌 없는 새 파일 `viewer/photoUv.ts`(전개도 점 → 사진 UV, `ThreeViewer`가 사진을 까는 변환의 역, 검사 `photoUv.test.ts`)만 만들었다. #122 머지 뒤: `buildStage`의 grid 면 메시마다 `faceUvs(face, netPhoto, aspect)`를 `uv`로 넣고 텍스처를 붙이면 된다 (면 메시와 `net.faces` 순서 대응은 `gridNet.ts`에서 확인). W2 — `vision_eval --engine agy` 추가(측정은 계정 사용량이라 아직 안 돌림)

**홀로그램 세션 공유 (2026-10-31)**: 시험 통합 브랜치(`test/holo-photo`, 로컬)에서 사진 → 도형 → 홀로그램이 PC·휴대폰 모두 동작. 휴대폰에서 "도형에 프레임을 씌우면 잘 잡힘". #130에 필요한 확정 사항: `HologramProps = { scene, center, showGuide, onTap }`, `stageSupported`는 다면체 면 2개 이상일 때만, 잘못 그린 전개도도 그대로 접힘. 학습지 정답 13개가 `viewer/worksheetScenes.ts`에 복사돼 `stage.test`가 쓴다 → **`evals/answers.json`을 바꾸면 그 파일도 맞춘다**. 합칠 때 충돌은 `package.json` test 줄뿐이었다

**정합성 확인 (2026-10-31, 이 세션)**: `feature/worksheets`(최신) + `feature/122-hologram-mode`(최신)를 임시 작업 폴더에서 합쳐 봄 → 충돌은 `package.json` test 줄뿐(양쪽 검사 합쳐 11개 줄), `App.tsx`·`index.css`·TODO 목록은 자동으로 합쳐짐. 합친 상태 build·lint·검사 13개 통과. #130 연결 메모: 무대 면 i의 사진 조각은 `gridPolyhedron(net).netFaces[i]`로 `net.faces` 칸을 찾아 `faceUvs`에 넣는다. `gridNet.ts` 213줄 근처가 면 좌표를 (0,0)부터로 옮기므로, 사진 좌표(`netPhoto`)와 원점이 같은지 연결할 때 화면으로 확인한다. `HologramProps`에 `photo?: NetPhoto`를 더하는 것은 홀로그램 세션과 맞춘다

P4 끝 (#130, #122 머지 뒤) — `buildStage(scene, theme, { photo })`, `HologramProps.photo`, 토큰 `photo`(`PAPER` 그대로, `HOLOGRAM` 반전·종이 투명). 면 UV 는 펼친 상태의 루트 좌표로 재서 면 순서 대응이 필요 없다. 보관함의 3-2 → 홀로그램: 면마다 "7"·"㉡" 조각이 빛나며 접힌다. 인쇄된 면 바탕색은 옅은 막으로 남는다(`glowPixels`의 `paper` 값으로 조절)

**측정 (2026-10-31, 두 학습지, 잘라낸 사진, agy 병렬)**

| 무엇 | 방법 | 3-2 (계단형) | 29번 (십자형 + 겨냥도) |
|---|---|---|---|
| 도형 | `gemini-3.8-flash-medium` | 49.7초, 맞음 (전체 사진일 때 60~115초) | 79.4초, 모양 맞음·치수 1·1·1로 뭉갬 (전체 127초) |
| 도형 | `gemini-3.8-flash-low` | 실패 (에이전트가 명령을 쓰려다 거부) | 17.6초, 치수 뭉갬 |
| 도형 | **`gemini-4-argon-low`** | **20.5초, 맞음** | **28.9초, 가장 맞음** (가로 1.4·세로 1·높이 1, 면 폭이 번갈아 다름) |
| 문제 글 | Tesseract.js (브라우저 OCR) | 0.6초, "다음→다룰", ㉠㉡㉢→"©), ©, 6" | 0.5초, 빨간 펜이 지나간 글자 깨짐. 빨간 펜 지우기·대비·2배 키우기도 거의 그대로 |
| 문제 글 | `gemini-3.8-flash-low` (글자만) | **15.5초, 완벽** (손글씨 10 → □) | **13.4초, 완벽** |

→ **잘라내면 같은 모델이 1.5~2배 빠르다. 도형은 `gemini-4-argon-low`가 빠르고 가장 맞다. 문제 글은 OCR이 빠르지만 학생에게 보여 줄 만큼 정확하지 않아 `flash-low` 글자 읽기**를 도형과 동시에 돌린다(전체 대기 = 도형 시간 약 20~30초)

**2단계 네모 (2026-10-31, 사용자 결정)**: 사진을 고르면 ① "문제 전체(문장과 그림)를 네모로 감싸 주세요" → [다음: 도형 고르기] (아래 줄에 [문제 없이 도형만] [사진 전체 읽기]) → ② "이제 도형(그림)만 네모로 딱 맞게 감싸 주세요", ①의 네모는 주황 점선으로 남는다 → [이 도형 읽기] / [문제 다시 고르기]. 도형 칸은 `/analyze` `file`(모양, `gemini-4-argon-low`), 문제 칸은 `problem`(글자만, `flash-low`)으로 보내 backend가 **동시에** 읽는다. 3-2: 클릭부터 결과까지 26초 이내, 전개도·문제 글 모두 맞음 (처음 2분). 전개도 칸 배치를 색으로 찾는 자동 누끼는 사진마다 흔들려 하지 않는다. 대신 ② 에 들어갈 때 도형 **바깥 네모만** 추천한다(아래 "추천 네모"). 문제 글은 OCR(Tesseract.js)이 0.5초로 빠르지만 펜 자국·㉠ 기호에서 틀려 쓰지 않는다. **직접 만들기 접기**: 사진이 있으면 "인식이 틀렸나요? 직접 고치기 ▸" 한 줄로 접고, 누르거나 인식이 실패하면(`PhotoUpload` 선택 prop `onManual`) 그 사진에서만 펼친다. 사진이 없으면 지금처럼 펼친다(수동 경로는 늘 한 번에 닿는다, stack.md 규칙 그대로). ui.md 화면 배치 2·3번에 적었다 (2026-10-31)

**추천 네모 (2026-10-31, 사용자 결정, #151)**: ① 문제 칸을 고르고 [다음: 도형 고르기]를 누르면, 그 칸 안에서 **색칠된 도형·전개도 덩어리**를 찾아 ② 도형 네모(①②…)로 미리 깔아 준다. LLM 없이 브라우저에서 픽셀로 찾는다(`ui/suggestBoxes.ts`, 문제 칸을 긴 변 480px 로 줄여 → 곳마다 종이 밝기(조명이 한쪽만 어두워서)보다 어둡고 채도 낮은 곳, 빨간 펜 빼기 → 글자 지우기·끊긴 면 잇기 → 덩어리마다 네모 → 라벨 ㄱ·ㄴ 이 들어가게 둘레를 넓히되 옆 도형과의 가운데까지만). 실측 0.02~0.08초 (29번·3-2 로 값 맞춤).
- 맞으면 바로 [도형 n개 읽기]. 틀리면 [네모 지우기]로 추천을 모두 지우고 지금처럼 직접 감싼다. 추천에 하나가 빠졌으면 그대로 감싸고 [도형 더하기 +]
- 못 찾으면(색칠 없는 선 전개도 등) 아무것도 깔지 않고 지금 안내 그대로. 여섯 개까지만
- 칸 배치(grid 면)는 찾지 않는다. 바깥 네모만이라 사진이 조금 흔들려도 학생이 보고 고칠 수 있다
- 문제 칸을 넉넉히 그리면 들어오는 것을 뺀다 (2026-10-31 흐름 확인에서 나옴): 칸 가장자리에 붙은 덩어리(책 페이지 그림자·제본 띠·위쪽 종이가 휜 어두운 곳. 위(글 쪽) 가장자리에 닿거나, 한 가장자리의 60% 넘게 붙은 가는 띠(폭 15% 미만). 문제 칸은 위에 글, 아래에 그림이라 그림은 위 가장자리에 닿지 않는다. 두 가장자리에 닿는 것만으로는 버리지 않는다 — 꼭 맞게 그린 칸에서 전개도가 오른쪽·아래에 같이 닿아 29번이 1개만 잡혔다, #155), 테두리가 흐린 덩어리(조명 그림자 얼룩, 테두리 밝기 변화 8 미만. 인쇄 그림은 15~35). 빽빽한 글 줄은 줄이면 회색 띠가 되어 작은 얼룩 지우기를 4칸으로 했다
- 라벨 자리로 위·아래를 넓힐 때 문제 글 줄(한 줄에서 검정이 네모 폭의 12% 넘음) 앞에서 멈춘다
- **사진이 옆으로 누워 있으면 추천하지 않고** "사진이 옆으로 누워 있어 도형을 못 찾았어요. 아래 \"돌리기\"로 글자를 바로 세운 뒤 문제를 다시 감싸 주세요 (그대로 직접 감싸도 돼요)" (2026-10-31 휴대폰 실측: 누운 글 줄을 도형으로 잡음). 누운 것은 가는 획만 남겨 행·열로 더했을 때 줄 사이 빈 칸이 생기는 쪽으로 안다(두 학습지 13가지 모두 맞음). 누운 사진에서 도형만 가려내는 것은 글 줄·손글씨가 도형과 픽셀로 갈리지 않아 하지 않는다
- 밝기 값은 곳마다 종이 밝기에 대한 비율이다(어두운 휴대폰 사진). 글이 아래쪽에 있는 사진(거꾸로)은 위 대신 아래 가장자리를 본다. 그림자를 가르는 테두리 또렷함 기준은 11(브라우저 실측 인쇄 14~61, 그림자 3.6~8.8)

**여러 도형 배치 (2026-10-31, 팀과 같이 보는 제안, 화면 연결 전)**: 학습지에 전개도가 여러 개(①~⑥)인 문제를 한 페이지에 놓는 계산 `viewer/pageSlots.ts`(`pageSlots(page, aspects)` → 칸, three.js 없음, 검사 `pageSlots.test.ts`). 개수마다 줄·칸을 미리 정하지 않고 줄 수 × 칸 수 후보 중 도형이 가장 크게 들어가는 것을 고르고 마지막 줄은 가운데. 최대 6개. 미리보기 `npm run dev` → `/lab/page-slots.html` (세로 3:4 페이지에 정육면체 전개도 1~6개). 03 제외 범위("한 사진에 전개도가 여러 개인 문제")와 ShapeScene(도형 하나)을 바꿔야 화면에 연결할 수 있어 팀 합의 뒤. 같이 볼 것: 다 접은 도형을 크게 보는 구도(지금은 왼쪽 쪽 글까지 담아 작다, #129 남은 것). 01 폴더 문서의 viewer·lab 칸에도 적었다

**여러 도형 (2026-10-31 팀 합의: 문제에 전개도·도형이 여러 개인 경우도 지원) — 구현 (c07ce7f, 9ff4b5f, 이번 App·PhotoUpload 커밋)**. 사용자 결정 추가: 여러 개는 따로가 아니라 **책 안에 같이**(pageSlots) 그린다(펜 세션 전달). 29번 겨냥도·전개도 두 도형으로 확인: 동시에 읽기 약 50초, 책에 같이 펼침, 책에서 ② 누르면 ②만 접힘, 홀로그램도 ②만

사용자 결정 (2026-10-31): **고른 하나만 접는다. 홀로그램도 고른 하나만** (여러 개가 같이 홀로그램에 나오면 피라미드 안에서 겹쳐 보기 어렵다). **도형은 학생이 하나씩 네모로 그린다** (도형이 많은 문제는 흔하지 않다). 펼쳐 놓은 나머지·고른 도형의 색은 지금 규칙 그대로(책 `PAPER` 흰 면, 홀로그램 `facePalette` 6색). 구현은 `App.tsx`·`ThreeViewer.tsx`·`viewer/index.ts`를 고치던 다른 작업이 끝난 뒤

| 층 | 바꾸는 것 | 이유 |
|---|---|---|
| 범위 | 03 제외 범위에서 "한 사진에 전개도가 여러 개인 문제"를 뺀다 (최대 6개) | 팀 합의 |
| 계약 | **ShapeScene 은 그대로 하나**. 여러 개는 그 목록으로 다룬다 (`ShapeScene[]`, 같은 문제 글은 각 장면 `problem`에 같이) | 뷰어·홀로그램·보관함이 모두 장면 하나를 기준으로 짜여 있어서, 목록 바깥만 늘리면 안쪽은 그대로 쓸 수 있다 |
| 인식 | ② 단계에서 도형 네모를 **여러 개** 그린다 (확정) ("도형 더하기", ①②③ 번호). 네모마다 `/analyze`(같은 문제 칸) → 장면 하나씩. 동시에 읽는다(agy 줄 수를 늘림) | 한 번에 여러 개를 읽히면 느리고 틀리기 쉽다(W0). 네모가 곧 사진 위치라 칸 밑 사진 맞춤도 그대로 |
| 화면 | (확정) 책 오른쪽 페이지에 `pageSlots`로 모두 펼쳐 놓고, **고른 하나만 접는다**. 홀로그램도 고른 하나만(①을 누르면 ①이 접히고 나머지는 펼친 채). 접기·선 긋기·설명·홀로그램은 고른 장면에만 | "전개도 고르기" 문제는 보기를 하나씩 접어 확인하는 게 공부다 |
| 뷰어 | `ViewerProps`에 `gallery?: { scene, label }[]`(펼친 채 그릴 나머지)와 `onPickGallery(i)`. 지금 장면은 자기 칸 자리·크기로 | viewer.md 를 먼저 고친다. `ThreeViewer.tsx` 는 다른 작업이 고치는 중이라 그 뒤에 |
| 보관함 | 학습지 하나에 장면 여러 개 (`scenes`, `places`) | |

**순서**: P0 → P1 → (P2 합의를 기다리는 동안 W2) → P2 → P3 → P4. P1은 계약 변경 없이 바로 할 수 있다.

**브랜치**: 지금 `feature/worksheets`(W1·문서)를 P1까지 이어 가고 PR. P2는 계약 이슈 번호로 새 브랜치, P3·P4도 각각 새 브랜치 (TODO 하나에 PR 하나).

**홀로그램 브랜치(`feature/122-hologram-mode`)와 겹치는 파일**

| 파일 | 홀로그램 | 우리 | 규칙 |
|---|---|---|---|
| `ui/App.tsx` | 홀로그램 버튼·모드 | P2 문제 글 `pageText`, P4 prop 한 줄 | 늦게 머지하는 쪽이 맞춘다. 우리는 줄 단위로만 더한다 |
| `index.css` | 홀로그램 화면 | P1 비교 화면 | 각자 자기 블록 끝에만 더한다 |
| `package.json` `test` 줄 | `stage.test`, `holoLayout.test` | `photoPrep`·`perspective`(이미), P3 `worksheetStore.test` | 양쪽 검사를 모두 남긴다 |
| `viewer/stage.ts` | 무대 전체 | P4 사진 경로만 | P4는 #122 머지 뒤에만 시작 |
| `docs/todo/00-todo-list.md` | TODO-43 줄 | 버그·모바일 섹션 | 섹션이 달라 줄 단위로 합친다 |

---

## A. 작업 나누기

| 가칭 | 작업 | 영역 | 선행 | 크기 |
|---|---|---|---|---|
| W1 | 팀 테스트용 인식 엔진 `agy` | backend `ai/` | 실험 W0 | 반나절 |
| W2 | eval 에서 엔진·모델 고르기 (`--engine agy --model …`) | backend `evals/` | W1 | 반나절 |
| W3 | 내 학습지 보관함 (기기 안 저장, 다시 열기, 지우기) | frontend `ui/` | mobile 브랜치 머지 | 하루 |
| W4 | 인식 대기 화면 (사진 위 "읽는 중", 걸린 시간) | frontend `ui/` | W3 | 반나절 |
| W5 | 사진 돌리기 ↻ 90° (버그 [B2](../todo/B2-photo-overlay-rotated.md) 해결) | frontend `ui/` | 없음 | 반나절 |
| W6 | (인계, 2026-10-31) 학습지 사진을 홀로그램 면에 입혀 접기. 홀로그램 브랜치 `feature/122-hologram-mode`(#122) 머지 뒤. 메모: `git show feature/122-hologram-mode:docs/proposals/hologram/photo-handoff.md`. `stage.ts` 사진 경로 + prop 한 줄로 좁히고 `HologramMode`·`HologramViewer`·`holoLayout`, ShapeScene·ViewerProps는 고치지 않는다 | frontend `viewer/` | #122 머지 | 하루 |

- **W0 결과 (2026-10-31)**: 사진은 프롬프트 앞 `@photo.jpg`로 붙인다(붙이지 않으면 에이전트가 명령으로 열려다 거부된다). 출력은 `{"status","response":"```json …```","usage"}`라 기존 `cli_scene`으로 읽힌다

  | 학습지 | 모델 | 시간 | 결과 |
  |---|---|---|---|
  | 29번 직육면체 선 (십자형 + 선) | flash-medium | 127초 | 구조·라벨·인쇄 선 맞음, 치수는 2·2·1로 단순화 |
  | 3-2 정육면체 숫자 (계단형, 사진 옆으로 누움) | flash-low | 15초 | **전개도 모양 틀림** (접히지만 마주 보는 면이 달라 답이 틀림) |
  | 3-2 | flash-medium | 약 2분 | 계단형·면 글자 맞음, 손글씨 답 무시 |

  → (그때) 기본 모델 `gemini-3.8-flash-medium`. 잘라낸 사진 측정 뒤 `gemini-4-argon-low`로 바꿨다 (아래 "측정"). 앱은 틀린 전개도도 접히면 알아채지 못하므로 사진과 비교해 보는 화면(W4)이 필요하다
- **W0 (실험, 30분)**: `agy`가 사진 파일을 읽고 ShapeScene JSON 하나를 돌려주는지, 걸리는 시간, 출력 형식을 사진 1~2장으로 확인한다. 사용자 계정 사용량을 쓰므로 사람이 정해서 돌린다. 결과에 따라 C절의 명령을 고친다
- **흐름**: backend(W1→W2)와 frontend(W3→W4)는 폴더가 달라 **동시에** 할 수 있다. 같은 흐름 안은 차례로

## B. 경계

```
[휴대폰/PC 브라우저]                         [backend]
 PhotoUpload ── 사진 ──▶ /analyze ──▶ analyze_image ──┬─ VISION_ENGINE=api (기본, 배포)  → Gemini API
   │  ▲                                               └─ VISION_ENGINE=agy (팀 테스트)  → agy CLI
   │  └── ShapeScene (계약 그대로) ◀──────────────────┘
   └─ 성공하면 보관함(IndexedDB, 이 기기 안)에 저장 → 다시 열면 /analyze 없이 바로 3D
```

- backend 엔진이 바뀌어도 frontend는 모른다 (응답은 같은 ShapeScene, 에러도 [api.md](api.md) 표 그대로)
- 보관함 데이터(`SavedWorksheet`)는 `ui/` 안에서만 쓴다. `shared/`에 넣지 않으므로 계약 변경 절차가 필요 없다

---

## C. W1: 팀 테스트용 인식 엔진 `agy`

- `backend/.env`
  - `VISION_ENGINE=agy`: `/analyze`가 Gemini API를 부르지 않고 이 컴퓨터에 로그인된 Antigravity CLI로 읽는다. 비우거나 `api`면 지금과 같다
  - `VISION_AGY_MODEL=`: 비우면 `gemini-4-argon-low` (문제 글은 `VISION_AGY_TEXT_MODEL=`, 비우면 `gemini-3.8-flash-low`) (`agy models`로 목록. 2026-10-31 기준 Gemini 4 Argon·3.8 Flash 등)
  - 기존 `VISION_CLI=1`(API 실패 시 Gemini CLI 비상 경로)은 그대로 둔다
- `backend/app/ai/vision.py`
  - `recognize_agy(image, content_type) -> ShapeScene`: 기존 `recognize_cli`와 같은 모양. 사진을 임시 폴더에 두고 그 폴더에서 실행
    ```
    agy -p "<사진 파일 이름> 을 읽고 지시대로 JSON 하나만" --output-format json --model <모델> --sandbox --add-dir <임시 폴더> --print-timeout 120s
    ```
    프롬프트(`VISION_PROMPT`)를 넘기는 방법(stdin 또는 파일), 출력 JSON 모양, 사진 읽기에 권한 확인이 뜨는지는 **W0에서 확인해 적는다**
  - 결과는 지금처럼 `ShapeScene.model_validate`로 검증하고, 실패는 `VisionError`(422·503 표 그대로)
  - 도형은 셋까지, 문제 글은 하나씩 동시에 실행한다 (`threading.Semaphore`, 여러 도형). 더 오면 차례로
  - **미리 띄워 두기·늦으면 하나 더** (#150, `ai/agy.py`): 실행은 `--input-format stream-json --output-format stream-json`으로 띄워 두고, 요청이 오면 사진을 그 폴더에 넣고 메시지 한 줄을 보낸다
    - 모델마다 대기 프로세스를 둔다(도형 3, 문제 글 1). 한 번 쓰면 끄고 뒤에서 새로 띄운다(앞 사진이 대화에 남지 않게). 10분 넘게 논 것·죽은 것은 버리고 새로 띄운다
    - 25초 안에 답이 없으면 같은 요청을 하나 더 보내고 먼저 온 답을 쓴다 (나머지는 끈다)
    - 측정 (2026-10-31, 실제 흐름 29번 두 도형): 띄우기 5.5초가 사라지고, 평소 약 20초·가끔 56~62초(요청 하나가 40초 늦음)였다. stream-json 입력은 글자만 받아 사진은 지금처럼 `@파일`(에이전트가 `read_file`로 연다)
  - `analyze_image`: `VISION_ENGINE`이 `agy`면 `recognize_agy`, 아니면 지금 흐름. 같은 사진 기억(해시)은 엔진과 상관없이 쓴다
- **안전**
  - `--dangerously-skip-permissions`를 쓰지 않는다. `--sandbox`로 실행하고 작업 폴더는 사진만 든 임시 폴더
  - 학습지 글이 에이전트에게 지시하는 문장이어도 결과는 ShapeScene 검증을 통과해야만 쓴다
  - 서버 로그에 "팀 테스트 엔진(agy)"을 남긴다. 배포 서버 `.env`에는 넣지 않는다 (개인 계정 사용량)
- 검사: `tests/test_analyze.py`에 엔진 고르기(환경 변수 → 부르는 함수), `agy` 출력 → ShapeScene 파싱을 LLM 없이 (subprocess 가짜)
- 문서: [api.md](api.md) "/analyze 에러" 아래에 엔진 한 단락, [stack.md](stack.md) LLM 항목, `.env.example`, README "팀 테스트"

## D. W2: eval 엔진·모델 고르기

- `python -m evals.vision_eval --engine agy --model gemini-4-argon-medium` 처럼 엔진과 모델을 고른다. 기본은 지금(API)
- 목적: API 비용 없이 모델별 정확도·시간을 비교해, 배포 때 쓸 모델을 고른다. 1600px로 줄인 사진([mobile.md](mobile.md) M2)도 같이 잰다
- 결과는 `evals/results/`(git 제외)에 두고 숫자만 리포트로 옮긴다

## E. W3: 내 학습지 보관함

**저장**: 이 기기 브라우저의 IndexedDB. 서버로 보내지 않는다 (로그인 없음, 학생 사진이 밖으로 나가지 않음). [03](../03-product-plan.md) 제외 범위 "학습 기록 저장"은 서버 저장을 뜻하는 것으로 고쳐 적는다

- 새 파일 `ui/worksheetStore.ts` (React 없음)
  ```ts
  export interface SavedWorksheet {
    id: string            // crypto.randomUUID()
    savedAt: number       // Date.now()
    name: string          // 기본: 도형 이름 + 날짜 (예: "직육면체 · 10/31 14:20"), 바꿀 수 있음
    photo: Blob           // 기준 사진 (줄이고·편 사진, mobile.md M2·M3)
    thumb: Blob           // 긴 변 240px JPEG (목록용)
    scene: ShapeScene     // /analyze 결과 그대로
    place: PhotoPlace | null // 네모로 읽었으면 그 네모
  }
  export function listWorksheets(): Promise<Omit<SavedWorksheet, 'photo'>[]> // 최신 순
  export function getWorksheet(id: string): Promise<SavedWorksheet | null>
  export function saveWorksheet(w: Omit<SavedWorksheet, 'id' | 'savedAt'>): Promise<string>
  export function renameWorksheet(id: string, name: string): Promise<void>
  export function deleteWorksheet(id: string): Promise<void>
  ```
  - DB 이름 `foldy`, 저장소 `worksheets`, 버전 1. 최대 **30개**, 넘으면 가장 오래된 것부터 지운다 (사진 30장 ≈ 10MB)
  - IndexedDB를 못 쓰면(사생활 보호 모드 등) 함수들이 빈 목록·무시로 끝나고 화면에서 보관함을 숨긴다
- 새 파일 `ui/WorksheetShelf.tsx`: `PhotoUpload` 안, 올리기 버튼 아래 접히는 칸 "내 학습지 (n)". 썸네일 + 이름 + 날짜, 누르면 열기, 길게 누르거나 ⋯로 이름 바꾸기·지우기 (지우기는 한 번 더 묻는다)
- `PhotoUpload.tsx`
  - `read()` 성공 직후 `saveWorksheet` (기준 사진, 썸네일, scene, place)
  - 다시 열기 = 사진 인식이 성공했을 때와 **같은 길**: `setBase`처럼 사진을 기준 사진으로 두고 `onPhoto(url)` → `onScene(scene, place)`. 그래서 `App.tsx`는 바뀌지 않는다
- 화면 규칙은 [ui.md](ui.md) 화면 배치 2번(사진 업로드)에 먼저 적는다
- 검사: `worksheetStore`는 브라우저 API라 `npm test` 대신 이름 만들기·30개 넘을 때 지울 목록 고르기 같은 순수 함수만 `worksheetStore.test.ts`로. 저장·열기는 브라우저에서 확인

## F. W4: 인식 대기 화면

- `PhotoUpload`의 `loading` 동안 사진 위에 옅은 막 + 위에서 아래로 지나가는 선(읽는 중 느낌) + "사진에서 도형을 찾고 있어요… 12초"(지난 초)
- `agy` 엔진은 느릴 수 있어(W0에서 잼) 30초가 넘으면 "조금 더 걸려요. 그동안 아래에서 직접 그려 봐도 돼요"
- `index.css`는 사진 업로드 블록 바로 아래에 더한다. 움직임은 `prefers-reduced-motion`이면 끈다

---

## G. 변경 지도

| 파일 | W1 | W2 | W3 | W4 | 팀원 작업과 겹침 (10/28 이후 커밋 수) |
|---|---|---|---|---|---|
| `backend/app/ai/vision.py` | M | | | | 낮음 |
| `backend/tests/test_analyze.py` | M | | | | 낮음 |
| `backend/evals/vision_eval.py` | | M | | | 낮음 |
| `backend/.env.example`, `README.md` | M | | | | 낮음 |
| `docs/specs/api.md`, `stack.md` | M | | | | 낮음 |
| `frontend/src/ui/worksheetStore.ts` (+ `.test.ts`) | | | N | | 없음 |
| `frontend/src/ui/WorksheetShelf.tsx` | | | N | | 없음 |
| `frontend/src/ui/PhotoUpload.tsx` | | | M | M | 중간 (6) — mobile 브랜치가 먼저 머지돼야 한다 |
| `frontend/src/index.css` | | | M | M | **높음 (17)** — 사진 업로드 블록 아래에만 더한다 |
| `frontend/package.json` (`test` 줄) | | | M | | 중간 — 끝에만 붙인다 |
| `docs/specs/ui.md` (화면 배치 2번) | | | M | M | **높음** — 2번 칸만 |
| `docs/03-product-plan.md` (제외 범위 한 줄) | | | M | | 낮음 |
| `docs/01-folder-architecture.md` (`ui/` 칸) | | | M | | 중간 — 이름만 끝에 |
| `frontend/src/ui/App.tsx`, `viewer/` | | | | | **고치지 않는다** |

합칠 때 규칙은 [mobile.md](mobile.md) I절과 같다. 추가로:
- W3·W4는 mobile 브랜치(`feature/mobile-web`)가 main에 머지된 뒤 새 브랜치로 시작한다 (`PhotoUpload.tsx`를 같이 고치므로)
- W1은 main에서 바로 시작해도 된다 (frontend를 건드리지 않음)
- PR 전 확인: AGENTS.md "검증" 명령 + `VISION_ENGINE` 없이 지금과 똑같이 동작하는지 + (W3) 보관함에서 연 학습지가 처음 인식했을 때와 같은 3D·사진 위치인지
