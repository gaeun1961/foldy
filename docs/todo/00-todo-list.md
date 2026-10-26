# TODO List

> 위에서부터 읽는다. **일을 가져갈 때는 "지금 시작 가능"에서 하나 고른다.**  
> 가져갈 때: 그 이슈에 자기 자신을 assignee로 지정하고, 그 줄을 "진행 중"으로 옮긴다.  
> 끝낼 때: TODO 파일을 지우고 "진행 중"에서 빼고, 선행 조건이 풀린 TODO를 "1차 남은 일"에서 "지금 시작 가능"으로 옮긴다 (같은 PR에서).  
> 번호는 TODO 번호(`TODO-3`)이고 GitHub 이슈 번호(`#9`)와 다르다. 이슈는 마일스톤(1차 직육면체 10/28, 2차 정다면체·각기둥·각뿔 10/29, 3차 원기둥·원뿔·구 10/30)으로 묶여 있다.

## 지금 시작 가능

선행 TODO가 모두 끝났고 assignee가 없는 TODO.

- **TODO-6** [꼭짓점·모서리 중점 클릭으로 선 긋기](06-click-draw-line.md) · [#12](https://github.com/gaeun1961/foldy/issues/12) — 3D: 꼭짓점·모서리 중점을 눌러 면 위에 선을 긋는다
- **TODO-5** [같은 꼭짓점을 같은 색으로 하이라이트](05-vertex-highlight.md) · [#11](https://github.com/gaeun1961/foldy/issues/11) — 3D: 접었을 때 만나는 꼭짓점들을 같은 색으로 표시한다
- **TODO-22** [맞닿는 모서리 같은 색으로 칠하기](22-matching-edge-colors.md) · [#32](https://github.com/gaeun1961/foldy/issues/32) — 3D: 접었을 때 맞닿는 모서리 한 쌍을 같은 색으로 칠한다
- **TODO-7** [학습지 사진 10장 수집 + 비전 LLM 프롬프트로 ShapeScene 추출 테스트](07-vision-prompt-test.md) · [#13](https://github.com/gaeun1961/foldy/issues/13) — AI: 실제 사진으로 인식 정확도를 재고 프롬프트를 만든다
- **TODO-9** [챗봇 기본 응답: 힌트형 시스템 프롬프트, 현재 ShapeScene을 맥락으로 /chat 연결](09-chatbot-basic.md) · [#15](https://github.com/gaeun1961/foldy/issues/15) — AI: 정답 대신 힌트를 주는 챗봇 답변
- **TODO-11** [사진 업로드 → /analyze 호출 → 뷰어 반영 (목 데이터 제거)](11-upload-analyze.md) · [#17](https://github.com/gaeun1961/foldy/issues/17) — UI: 사진을 올리면 backend 결과로 뷰어를 그린다
- **TODO-12** [수동 입력: 도형 드롭다운 + 치수 슬라이더](12-manual-input-form.md) · [#18](https://github.com/gaeun1961/foldy/issues/18) — UI: 인식이 틀렸을 때 도형과 치수를 바로 고친다
- **TODO-13** [챗봇 대화창 UI, /chat 연결](13-chat-ui.md) · [#19](https://github.com/gaeun1961/foldy/issues/19) — UI: 질문을 보내고 답을 대화로 본다
- **TODO-26** [직육면체 부피 시각화](26-cuboid-volume.md) · [#41](https://github.com/gaeun1961/foldy/issues/41) — 3D: 단위 정육면체를 한 층씩 쌓아 가로×세로×높이를 보여준다 (1차 다른 TODO보다 뒤)
- **TODO-25** [직육면체 겉넓이 시각화](25-cuboid-surface-area.md) · [#40](https://github.com/gaeun1961/foldy/issues/40) — 3D: 마주 보는 면 쌍을 차례로 칠하고 2×(ab+bc+ca)를 보여준다 (1차 다른 TODO보다 뒤)
- **TODO-28** [공간에서 모서리 위치 관계 (평행·수직·꼬인 위치)](28-edge-relations.md) · [#44](https://github.com/gaeun1961/foldy/issues/44) — 3D: 모서리를 누르면 평행·수직·꼬인 위치 모서리를 색으로 구분한다 (1차 다른 TODO보다 뒤)
- **TODO-30** [피타고라스: 직육면체 대각선, 겉면 위 최단 거리](30-pythagoras.md) · [#46](https://github.com/gaeun1961/foldy/issues/46) — 3D: 대각선 길이와 전개도 위 최단 거리를 직각삼각형으로 보여준다 (1차 다른 TODO보다 뒤)

## 진행 중

assignee가 있는 TODO. 다른 사람은 건드리지 않는다.

| TODO | 이슈 | 담당자 |
|---|---|---|
| (없음) | | |

## 1차 남은 일

선행 TODO가 끝나지 않아 아직 시작할 수 없는 1차 TODO. 선행이 끝나면 "지금 시작 가능"으로 옮긴다.

| TODO | 이슈 | 선행 |
|---|---|---|
| **TODO-8** [/analyze에 비전 LLM 연결, 실패 시 에러 응답](08-analyze-vision-llm.md) | [#14](https://github.com/gaeun1961/foldy/issues/14) | TODO-7 |
| **TODO-10** [챗봇이 화면 조작 명령을 함께 반환 (하이라이트, 슬라이더 값)](10-chatbot-view-commands.md) | [#16](https://github.com/gaeun1961/foldy/issues/16) | TODO-3, TODO-5, TODO-9 |
| **TODO-14** [전체 화면 디자인 정리](14-screen-design.md) | [#20](https://github.com/gaeun1961/foldy/issues/20) | TODO-11, TODO-12, TODO-13 |
| **TODO-15** [시연용 문제 선정, 데모 시나리오, 발표 자료](15-demo-presentation.md) | [#21](https://github.com/gaeun1961/foldy/issues/21) | TODO-8, TODO-10, TODO-14 |
| **TODO-29** [닮은 직육면체의 겉넓이비·부피비](29-similar-ratio.md) (1차 다른 TODO보다 뒤) | [#45](https://github.com/gaeun1961/foldy/issues/45) | TODO-25, TODO-26 |

## 나중에 (2차·3차)

**1차가 끝나기 전에는 가져가지 않는다.** 이슈는 "not planned"로 닫혀 있고, 1차 마일스톤이 끝나면 다시 연다.

| 단계 | TODO | 이슈 | 선행 |
|---|---|---|---|
| 2차 | **TODO-16** [정다면체 4종 면 트리 데이터 추가](16-regular-polyhedra-data.md) | [#24](https://github.com/gaeun1961/foldy/issues/24) | TODO-3 |
| 2차 | **TODO-31** [각기둥·각뿔 면 트리 데이터와 전개도](31-prism-pyramid.md) | [#47](https://github.com/gaeun1961/foldy/issues/47) | TODO-3 |
| 3차 | **TODO-17** [원기둥 말기 애니메이션](17-cylinder-roll.md) | [#25](https://github.com/gaeun1961/foldy/issues/25) | TODO-2 |
| 3차 | **TODO-18** [원뿔 말기 애니메이션](18-cone-roll.md) | [#26](https://github.com/gaeun1961/foldy/issues/26) | TODO-17 |
| 3차 | **TODO-19** [곡면 도형 위 선 그리기 (전개도 직선이 곡면을 따라 감기게)](19-curved-lines.md) | [#27](https://github.com/gaeun1961/foldy/issues/27) | TODO-18 |
| 3차 | **TODO-20** [곡면 도형 선 입력 (전개도 상태에서 클릭)](20-curved-line-input.md) | [#28](https://github.com/gaeun1961/foldy/issues/28) | TODO-19, TODO-6 |
| 3차 | **TODO-27** [원의 넓이 유도 시각화](27-circle-area.md) | [#42](https://github.com/gaeun1961/foldy/issues/42) | 없음 |
| 3차 | **TODO-21** [곡면 도형 겉넓이·부피 시각화](21-curved-area-volume.md) | [#29](https://github.com/gaeun1961/foldy/issues/29) | TODO-17, TODO-27 |
| 3차 | **TODO-32** [회전체 만들기](32-solid-of-revolution.md) | [#48](https://github.com/gaeun1961/foldy/issues/48) | TODO-17, TODO-18 |
| 3차 | **TODO-33** [단면 보기](33-cross-section.md) | [#49](https://github.com/gaeun1961/foldy/issues/49) | TODO-32 |
| 3차 | **TODO-34** [구의 겉넓이·부피](34-sphere-area-volume.md) | [#50](https://github.com/gaeun1961/foldy/issues/50) | TODO-27 |
