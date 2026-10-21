# TODO List

> `docs/todo`에 있는 후속 작업을 한 줄씩 요약합니다. TODO 하나는 한 사람이 반나절~하루에 끝낼 크기입니다.  
> 일을 가져갈 때는 **이슈** 칸의 GitHub 이슈에 자기 자신을 assignee로 지정하고 시작합니다. assignee가 있는 이슈는 건드리지 않습니다.  
> 브랜치와 PR은 그 이슈 번호를 씁니다 (예: `feature/9-fold-animation-slider`, PR 본문 `Closes #9`).  
> 🟢 = 선행 TODO가 없어 바로 시작할 수 있음. 선행 TODO가 끝나면(목록에서 사라지면) 시작할 수 있습니다.  
> 완료된 TODO는 해당 파일을 삭제하고, `docs/reports/`에 작업 기록을 남긴 뒤, 이 목록에서도 제거합니다 (같은 PR에서).  
> 번호는 TODO 번호이고(`TODO-3`), GitHub 이슈 번호(`#9`)와 다릅니다.

## 우선순위

**1차부터 끝낸다.** 데모의 핵심은 직육면체 선 긋기 문제다. 같은 시점에 고를 수 있으면 단계가 낮은 것을 먼저 가져간다.

| 단계 | 목표 | TODO |
|---|---|---|
| **1차** | 직육면체 완성 (+ 사진 인식, 챗봇, 화면, 발표) | 2~15, 22 |
| **2차** | 정다면체 4종 | 16 |
| **3차** | 원기둥·원뿔과 곡면 선 | 17~21 |

## 3D 뷰어

| # | 단계 | 바로 시작 | TODO | 선행 | 이슈 |
|---|---|---|---|---|---|
| 2 | 1차 | 🟢 | [면 트리 기반 다면체 렌더링 (직육면체부터)](02-face-split-render.md) | - (TODO-1 완료: 플랜 B) | [#8](https://github.com/gaeun1961/foldy/issues/8) |
| 3 | 1차 |  | [접기 애니메이션 + 슬라이더](03-fold-animation-slider.md) | TODO-2 | [#9](https://github.com/gaeun1961/foldy/issues/9) |
| 4 | 1차 |  | [ShapeScene.lines를 면 위에 그리기, 접힐 때 같이 움직이게](04-face-lines.md) | TODO-2 | [#10](https://github.com/gaeun1961/foldy/issues/10) |
| 5 | 1차 |  | [같은 꼭짓점을 같은 색으로 하이라이트](05-vertex-highlight.md) | TODO-3 | [#11](https://github.com/gaeun1961/foldy/issues/11) |
| 6 | 1차 |  | [꼭짓점·모서리 중점 클릭으로 선 긋기](06-click-draw-line.md) | TODO-4 | [#12](https://github.com/gaeun1961/foldy/issues/12) |
| 22 | 1차 |  | [맞닿는 모서리 같은 색으로 칠하기](22-matching-edge-colors.md) | TODO-3 | [#32](https://github.com/gaeun1961/foldy/issues/32) |
| 16 | 2차 |  | [정다면체 4종 면 트리 데이터 추가](16-regular-polyhedra-data.md) | TODO-3 | [#24](https://github.com/gaeun1961/foldy/issues/24) |
| 17 | 3차 |  | [원기둥 말기 애니메이션](17-cylinder-roll.md) | TODO-2 | [#25](https://github.com/gaeun1961/foldy/issues/25) |
| 18 | 3차 |  | [원뿔 말기 애니메이션](18-cone-roll.md) | TODO-17 | [#26](https://github.com/gaeun1961/foldy/issues/26) |
| 19 | 3차 |  | [곡면 도형 위 선 그리기 (전개도 직선이 곡면을 따라 감기게)](19-curved-lines.md) | TODO-18 | [#27](https://github.com/gaeun1961/foldy/issues/27) |
| 20 | 3차 |  | [곡면 도형 선 입력 (전개도 상태에서 클릭)](20-curved-line-input.md) | TODO-19, TODO-6 | [#28](https://github.com/gaeun1961/foldy/issues/28) |
| 21 | 3차 |  | [곡면 도형 겉넓이·부피 시각화](21-curved-area-volume.md) | TODO-17 | [#29](https://github.com/gaeun1961/foldy/issues/29) |

## AI

| # | 단계 | 바로 시작 | TODO | 선행 | 이슈 |
|---|---|---|---|---|---|
| 7 | 1차 | 🟢 | [학습지 사진 10장 수집 + 비전 LLM 프롬프트로 ShapeScene 추출 테스트](07-vision-prompt-test.md) | - | [#13](https://github.com/gaeun1961/foldy/issues/13) |
| 8 | 1차 |  | [/analyze에 비전 LLM 연결, 실패 시 에러 응답](08-analyze-vision-llm.md) | TODO-7 | [#14](https://github.com/gaeun1961/foldy/issues/14) |
| 9 | 1차 | 🟢 | [챗봇 기본 응답: 힌트형 시스템 프롬프트, 현재 ShapeScene을 맥락으로 /chat 연결](09-chatbot-basic.md) | - | [#15](https://github.com/gaeun1961/foldy/issues/15) |
| 10 | 1차 |  | [챗봇이 화면 조작 명령을 함께 반환 (하이라이트, 슬라이더 값)](10-chatbot-view-commands.md) | TODO-3, TODO-5, TODO-9 | [#16](https://github.com/gaeun1961/foldy/issues/16) |

## UI·통합

| # | 단계 | 바로 시작 | TODO | 선행 | 이슈 |
|---|---|---|---|---|---|
| 11 | 1차 | 🟢 | [사진 업로드 → /analyze 호출 → 뷰어 반영 (목 데이터 제거)](11-upload-analyze.md) | - | [#17](https://github.com/gaeun1961/foldy/issues/17) |
| 12 | 1차 | 🟢 | [수동 입력: 도형 드롭다운 + 치수 슬라이더](12-manual-input-form.md) | - | [#18](https://github.com/gaeun1961/foldy/issues/18) |
| 13 | 1차 | 🟢 | [챗봇 대화창 UI, /chat 연결](13-chat-ui.md) | - | [#19](https://github.com/gaeun1961/foldy/issues/19) |
| 14 | 1차 |  | [전체 화면 디자인 정리](14-screen-design.md) | TODO-11, TODO-12, TODO-13 | [#20](https://github.com/gaeun1961/foldy/issues/20) |

## 발표

| # | 단계 | 바로 시작 | TODO | 선행 | 이슈 |
|---|---|---|---|---|---|
| 15 | 1차 |  | [시연용 문제 선정, 데모 시나리오, 발표 자료](15-demo-presentation.md) | TODO-8, TODO-10, TODO-14 | [#21](https://github.com/gaeun1961/foldy/issues/21) |
