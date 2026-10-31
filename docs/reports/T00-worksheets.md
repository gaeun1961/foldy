# 작업 기록 - 내 학습지 (팀 테스트 인식 엔진, 사진 돌리기·비교, 문제 글·사진 맞춤, 보관함)

- 일시: 2026-10-31 (KST)
- 작성자: Phodo
- 에이전트: Claude Code
- 작업 유형: 기능 추가 + 계약 제안 (브랜치 `feature/worksheets`, push 전. 팀원에게 보여 준 뒤 이슈·PR)

## 요약
- 학생이 찍은 학습지가 ① 정확히 읽히고 ② 사진과 전개도가 겹치고 ③ 문제 글이 책에 나오고 ④ 기기에 남게 했다. 계획·명세는 [specs/worksheets.md](../specs/worksheets.md)
- API 비용 때문에 팀 테스트는 Antigravity CLI(`agy`)로 읽는다 (`VISION_ENGINE=agy`). 배포에서는 켜지 않는다

## 변경 범위
| 커밋 | 작업 | 내용 |
|---|---|---|
| W1 | 팀 테스트 엔진 | `vision.recognize_agy`, `/analyze`를 스레드에서(2분 동안 `/chat`이 막히던 것) |
| P1 (W5·W4) | 사진 놓기 | ↺·↻ 돌리기, 읽는 중 빛·지난 초, 인식한 전개도 그림(`NetPreview`) |
| P2 (W7·W8) | **계약 제안** | ShapeScene `problem`·`photoBox`(선택), 왼쪽 쪽 문제 글, 전체 읽기도 사진 자동 맞춤, 챗봇이 문제에 맞춰 힌트 |
| P3 (W3) | 보관함 | IndexedDB, 최대 30개, 다시 열면 `/analyze` 없이 |
| P4 준비·W2 | 홀로그램 사진 UV, eval 엔진 | `viewer/photoUv.ts`, `vision_eval --engine agy` |
| 문서 | 버그 명세 | B1(휠 확대로 책이 사라짐), B2(옆 사진 어긋남 → 끝), B3(사진을 키우면 뿌예짐) |

## 결정
- **`agy` 기본 모델 `gemini-3.8-flash-medium`**: low 는 15초지만 3-2 계단형 전개도를 다른 모양으로 읽었다(접히긴 해서 앱은 모름 → 답이 틀림). medium 은 1~2분, 두 학습지 모두 맞음
- **사진은 `@photo.jpg`로 프롬프트에 붙인다**: 안 붙이면 에이전트가 명령으로 열려다 거부된다. `--sandbox`, 권한 건너뛰기 없음
- **사진이 틀리게 읽혀도 앱은 모른다** → 인식한 전개도 그림을 사진과 나란히 (W4)
- **문제 글·사진 위치는 계약 하나로 묶었다** (`[계약]` 이슈 한 번에 합의). 둘 다 선택 항목이라 이전 데이터·코드는 그대로
- **보관함은 기기 안**: 03 제외 범위를 "서버에 학습 기록 저장"으로 좁혔다
- **App.tsx·viewer 는 거의 안 고쳤다** (App.tsx `pageTextOf` 한 줄): 팀원 작업과 겹침이 가장 큰 파일. 보관함 열기·사진 맞춤은 `PhotoUpload`가 기존 `onPhoto`·`onScene(place)` 길로

## 리스크/이슈
- **개발 서버가 고친 파일을 반쯤만 반영**한 적이 있다 (`clampBox is not defined`, 소스에는 있음). `npm run dev`를 다시 켜면 풀린다. 화면 확인 전에 이상하면 먼저 다시 켠다
- 돌리기 방향을 작은 화면으로 판단하다 두 번 틀렸다(3-2는 ↺). 사진은 크게 띄워 확인한다
- 홀로그램 사진(W6)은 #122 머지 전이라 연결하지 않았다
- 실제 휴대폰(사파리·크롬)에서 촬영·보관함을 아직 확인하지 않았다

## 다음 작업
- 팀원에게 보여 준 뒤: `[계약]` 이슈 합의 → PR (모바일 `feature/mobile-web` 다음 `feature/worksheets`)
- #122 머지 뒤 W6 연결, `vision_eval --engine agy`로 모델 비교, 프롬프트 개선(치수 비율)
- B1·B3 은 프론트 담당

## 참고
- 관련 문서: [specs/worksheets.md](../specs/worksheets.md), [specs/mobile.md](../specs/mobile.md), [specs/shape-scene.md](../specs/shape-scene.md) `problem`·`photoBox`, [T00-mobile-ideas](T00-mobile-ideas.md)
- 시험한 학습지: 29번(직육면체 면 위 선, 십자형), 3-2(정육면체 숫자, 계단형, 옆으로 찍음). 사진은 `backend/evals/photos/`(git 제외)
