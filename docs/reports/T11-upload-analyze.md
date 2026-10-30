# 작업 기록 - 사진 업로드 → /analyze 호출 → 뷰어 반영

- 일시: 2026-10-29 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- 업로드 영역의 "📷 학습지 사진 올리기"로 사진을 고르면 바로 `/analyze`를 부르고, 돌아온 ShapeScene으로 뷰어를 그린다(펼친 전개도에서 시작)
- 상태: 올리기 전 "학습지 사진을 올리면 도형이 나타나요", 인식 중 "사진에서 도형을 찾고 있어요…"(버튼 꺼짐), 성공하면 사진 미리보기 + "도형을 찾았어요. 접어 보세요!" + "다른 사진 올리기", 실패하면 backend 안내 문구 + "아래에서 도형을 직접 골라 보세요"(수동 입력 TODO-12로)
- frontend 목 데이터(`mock.ts`, 예시 전개도 `sampleScenes`)를 지웠다. 도형이 없으면 뷰어·조작 패널 대신 빈 상태 안내만 보이고, 챗봇은 도형이 없다고 안내한다

## 변경 범위
- `api.ts`: `analyze(photo)` (multipart `file`). 실패하면 backend `detail`을, 연결 실패면 학생용 문구를 담은 Error. backend 주소는 `API_URL` 한 곳
- `PhotoUpload.tsx`(새 파일): 업로드 버튼, 미리보기, 상태 문구
- `App.tsx`: `scene`이 `null`에서 시작, 새 도형은 `loadScene`으로(펼침 값·선·강조 초기화), 도형이 있을 때만 뷰어·접기·선 긋기·보기 옵션
- `index.css`: 업로드 버튼·상태 색. 예시 전개도 스타일 삭제
- 문서: `ui.md` 화면 배치 2번(상태), `stack.md`(frontend 목 데이터 없음), `01-folder-architecture.md`

## 결정
- 휴대폰에서 카메라와 앨범을 둘 다 고를 수 있게 `capture` 속성을 쓰지 않았다
- 같은 사진을 다시 골라도 다시 보내지게 고른 뒤 input 값을 비운다
- 실패 형식은 TODO-8이 `api.md`에 정한다. 여기서는 `detail` 문자열이 있으면 그대로 보여준다

## 확인
- 빌드·lint·`npm test` 통과
- backend를 잠깐 켜서 `/analyze`에 학습지 사진을 보내 ShapeScene(지금은 목)을, 텍스트 파일을 보내 400 `{"detail": "이미지 파일만 올릴 수 있어요"}`를 받는 것을 확인
- 헤드리스 크롬으로 올리기 전 빈 상태 화면 확인. 실제로 사진을 골라 그려지는 흐름은 화면에서 직접 확인한다

## 리스크/이슈
- 오늘 TODO-8·11·12를 함께 끝내려고, TODO-7 PR 전에 별도 작업 폴더(git worktree)에서 이 브랜치를 만들었다 (AGENTS.md "이전 PR이 머지된 뒤 다음 브랜치"의 예외, frontend만 고쳐서 TODO-7과 겹치지 않음)
- backend CORS가 `http://localhost:5173`만 허용한다. 다른 포트로 띄우면 업로드가 막힌다
- `/analyze`는 아직 목 데이터를 돌려준다. 실제 인식은 TODO-8

## 다음 작업
- TODO-8(`/analyze`에 비전 LLM), TODO-12(수동 입력: 인식 실패·틀림 대비)

## 참고
- 관련 문서: `docs/specs/api.md`, `docs/specs/ui.md` 화면 배치 2번
