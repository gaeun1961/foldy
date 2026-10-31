# TODO - 홀로그램 모드: 휴대폰 + 아크릴 피라미드로 도형 띄우기

- 등록 일시: 2026-10-31 14:13 (KST) (이슈), 계획 작성 2026-10-31 (KST)
- 작성자: HandoA01 (이슈), Phodo (계획)
- 에이전트: Claude Code
- 영역: 3D 뷰어 / UI·통합
- 이슈: [#122](https://github.com/gaeun1961/foldy/issues/122) `[TODO-43] 홀로그램 모드: 휴대폰 + 아크릴 피라미드로 도형 띄우기` (`3d`, `ui`)
- 선행 TODO: 없음

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #122`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 지금까지 (브랜치 `feature/122-hologram-mode`)

설계·명세는 [docs/proposals/hologram/](../proposals/hologram/README.md). 요약:

- 아래 바 "홀로그램" 버튼 → 지금 도형이 화면 전체 4방향 홀로그램 (사다리꼴 4칸, 카메라 4대). 돌아가기로 책 화면 그대로
- 도형별로 만들지 않는다: **무대**(`viewer/stage.ts`, 장면 + 토큰 → 도형 물체) + **3D 디자인 토큰**(`viewer/theme.ts`, 책 `PAPER` · 홀로그램 `HOLOGRAM`). 홀로그램은 도형을 모르고 비추기만 한다. 다면체·원기둥·원뿔·구 모두
- 휴대폰 확인: 노트북 모바일 핫스팟(192.168.137.1) + 방화벽 규칙으로 실제 휴대폰에서 동작 확인 (2026-10-31)
- 진행 상황 (2026-10-31): 1 맞춤 화면 구현. 2 QR·3 수업 방은 팀 협의 중. 사진 입혀 접기는 사진 세션에 인계 (`proposals/hologram/photo-handoff.md`)

## 목표

수업에서 바로 쓸 수 있게 세 단계를 더한다. 순서대로 한다 (2가 3의 입구다).

### 1. 맞춤 화면 (반나절)

처음 쓰는 사람도 아크릴 방향·크기를 10초 안에 맞추게 한다. 연구에서도 피라미드 홀로그램 수업의 문제로 "설치·사용 중 문제"가 보고됐다 (참고 2).

- 설정 판에 "맞추기" → 도형 대신 시험 화면
  - 칸마다 큰 글자 "앞·오른쪽·뒤·왼쪽" + 위쪽 화살표, 칸마다 다른 색 (앞 빨강, 오른쪽 초록, 뒤 파랑, 왼쪽 노랑)
  - 가운데 사각형을 밝게. "가운데" 슬라이더로 피라미드 꼭지 테두리에 맞춘다
- 둘레를 돌며 확인: 글자가 거울 글씨면 "좌우 반전", 화살표가 아래면 피라미드가 뒤집힘 안내, 순서가 앞→오른쪽→뒤→왼쪽이 아니면 기기 돌리기 안내
- "맞춤 완료" → 기기에 저장 (localStorage), 다음부터 바로 도형

### 2. QR로 바로 보기 (반나절)

선생님 화면의 QR을 학생 휴대폰이 찍으면 그 도형 홀로그램이 바로 뜬다. **backend 없이** 된다.

- 주소: `/#holo=<압축한 ShapeScene>`. `#` 뒤는 서버로 가지 않는다. 열면 책 화면 없이 홀로그램 보기로 시작
- 압축: JSON → deflate(`CompressionStream`) → base64url. 학습지 grid 전개도까지 QR 한 장에 들어가는지 검사 (목표: 1,000자 이하)
- 홀로그램 설정 판에 "QR로 나누기": 지금 도형의 QR 표시 (QR 생성 라이브러리 하나 추가 여부는 `stack.md`에 먼저 적고 팀 확인)
- 휴대폰 접속 조건 (문서화): 시연은 노트북 핫스팟 (Windows 모바일 핫스팟은 **기기 8대까지**). 한 반 전체는 정적 배포(HTTPS) 또는 학교 와이파이

### 3. 수업 방 (하루, backend)

선생님이 도형을 바꾸거나 접으면 학생 홀로그램이 모두 따라온다. 상용 수업 도구(참고 4)와 같은 "방 코드·QR로 들어오기" 방식이다.

- 구조: **서버 중계, 한 방향**. 선생님 → `PUT /api/holo/rooms/{room}` → 서버 → 학생들 `GET .../events` (Server-Sent Events). P2P는 쓰지 않는다 (30명 연결·학교망 차단). 학생이 답을 보내는 기능이 생기면 그때 WebSocket
- 방: 4자리 코드, 메모리에만, 선생님이 끝내거나 1시간 동안 갱신이 없으면 지운다. 끝나면 코드와 QR이 무효 (참고 4의 패턴)
- 2와 합치기: QR = 도형 + 방 코드. 방이 살아 있으면 따라가고, 없거나 끝나면 주소 속 도형으로 혼자 돈다
- 보내는 것: 도형·펼침 값·접는 방식뿐 (개인정보 없음. QR 주소는 누구나 볼 수 있다는 전제, 참고 4)
- API 초안: [proposals/hologram/api.md](../proposals/hologram/api.md). 시작 전에 `docs/specs/api.md`에 먼저 적는다

### 하지 않는 것 (보류)

- 학습지 사진을 면에 입혀 접기: 사진 작업(모바일 웹·내 학습지)이 main에 들어간 뒤 새 작업으로. 그 세션에 넘길 메모를 남긴다
- 설명 모드 홀로그램, 피라미드 전개도 인쇄: 나중에

## 완료 조건
- [ ] 1: 맞춤 화면으로 휴대폰·태블릿에서 방향·가운데 크기를 맞추고 저장된다 (구현·PC 확인 완료 2026-10-31, 실물 아크릴 확인 남음)
- [ ] 2: QR을 찍으면 다른 휴대폰에서 같은 도형 홀로그램이 뜬다 (학습지 grid 전개도 포함), backend 없이
- [ ] 3: 선생님 화면 접기 슬라이더를 움직이면 학생 휴대폰 2대 이상이 따라온다. 선생님이 나가도 학생 화면은 혼자 돈다
- [ ] 제안 문서(`docs/proposals/hologram/`)를 `docs/specs/viewer.md`·`ui.md`·`api.md`로 옮기고 폴더를 지운다
- [ ] `npm run build`·`lint`·`test`, backend 검사 통과. 리포트 `docs/reports/T43-hologram-mode.md`

## 참고
- 관련 문서: [proposals/hologram/README.md](../proposals/hologram/README.md), [spec.md](../proposals/hologram/spec.md), [api.md](../proposals/hologram/api.md)
- 용어: 진짜 홀로그램이 아니라 Pepper's ghost(반사) 효과다. 화면 문구는 "홀로그램"을 쓰되 발표 자료에서는 구분해 설명한다 (참고 3)
1. 피라미드 홀로그램으로 초등 4학년 50명의 공간 시각화 훈련: 종이 접기 검사(PFT)는 좋아졌고 정신적 회전(MRT)은 덜했다. foldy의 전개도 접기와 맞는 결과 ([JOIV, 3D Spatial Visualisation Skills Training Application for School Students Using Hologram Pyramid](https://joiv.org/index.php/joiv/article/view/61))
2. 중1 29명이 2주 동안 피라미드 홀로그램 사용: 대체로 긍정적, 다만 사용 중 문제가 있었다 ([ICITE 2020, Student Perception About 3D Object from Hologram Pyramid for Learning](https://download.atlantis-press.com/proceedings/icite-20/125948718)). 초등 80명 도형 단원 앱 평가는 기존 수업보다 효과적이라고 보고 ([JOIV, Evaluation of the Visual Learning Application for Mathematics using Holography Display](https://joiv.org/index.php/joiv/article/view/1679))
3. 피라미드 홀로그램을 기하 수업 도구로 본 학위 논문, 홀로그램과 Pepper's ghost 용어 혼동 지적 ([UFPA 학위 논문](https://www.repositorio.ufpa.br/bitstream/2011/15285/1/ModeloHolograficoEstrategia_Dissertacao.pdf))
4. 수업 동기화 사례: 학생이 QR·PIN으로 들어오고 교사가 화면을 이끈다 ([Gynzy Live Lesson](https://www.gynzy.com/en/blog/teach-in-real-time-with-live-lesson-synchronized-learning-across-devices), [Kira Live Classroom](https://support.kira-learning.com/en/articles/16041673-live-classroom-teach-in-sync-with-kira): 끝나면 코드·링크 무효, [SMART Lumio](https://support.smarttech.com/docs/software/lumio/en/delivering-lessons/help-students-join.cshtml)). QR 주소는 다른 사람도 볼 수 있다는 보안 주의 ([특허 US 9999013](https://patents.justia.com/patent/9999013))
5. 전개도 접기 소프트웨어와 공간 능력: DALEST "Origami Nets" ([Christou 외 2007](https://eprints.soton.ac.uk/45969))
- 근거는 소규모·단기 연구가 대부분이다. 효과를 주장할 때는 "보고된 사례" 수준으로 말한다
