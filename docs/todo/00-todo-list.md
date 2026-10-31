# TODO List

> 위에서부터 읽는다. **일을 가져갈 때는 "지금 시작 가능"에서 하나 고른다.**  
> 가져갈 때: 그 이슈에 자기 자신을 assignee로 지정하고, 그 줄을 "진행 중"으로 옮긴다.  
> 끝낼 때: TODO 파일을 지우고 "진행 중"에서 빼고, 선행 조건이 풀린 TODO를 "1차 남은 일"에서 "지금 시작 가능"으로 옮긴다 (같은 PR에서).  
> 번호는 TODO 번호(`TODO-3`)이고 GitHub 이슈 번호(`#9`)와 다르다. 이슈는 마일스톤(1차 직육면체 10/28, 2차 정다면체·각기둥·각뿔 10/29, 3차 원기둥·원뿔·구 10/30)으로 묶여 있다.

## 지금 시작 가능

선행 TODO가 모두 끝났고 assignee가 없는 TODO.


## 진행 중

assignee가 있는 TODO. 다른 사람은 건드리지 않는다.

| TODO | 이슈 | 담당자 |
|---|---|---|
| **TODO-15** [시연용 문제 선정, 데모 시나리오, 발표 자료](15-demo-presentation.md) | [#21](https://github.com/gaeun1961/foldy/issues/21) | gaeun1961 |
| **TODO-43** [홀로그램 모드: 휴대폰 + 아크릴 피라미드로 도형 띄우기](43-hologram-mode.md) | [#122](https://github.com/gaeun1961/foldy/issues/122) | kimdaeone |

## 1차 남은 일

선행 TODO가 끝나지 않아 아직 시작할 수 없는 1차 TODO. 선행이 끝나면 "지금 시작 가능"으로 옮긴다.

| TODO | 이슈 | 선행 |
|---|---|---|
| (없음) | | |

## 나중에 (3차)

2차(정다면체 TODO-16, 각기둥·각뿔 TODO-31)는 시연을 위해 1차보다 먼저 끝냈다(사용자 결정, 리포트 T16·T31). 3차는 아직 가져가지 않는다. 이슈는 "not planned"로 닫혀 있고, 시작할 때 다시 연다.

| 단계 | TODO | 이슈 | 선행 |
|---|---|---|---|
| 3차 | **TODO-32** [회전체 만들기](32-solid-of-revolution.md) | [#48](https://github.com/gaeun1961/foldy/issues/48) | 없음 |
| 3차 | **TODO-33** [단면 보기](33-cross-section.md) | [#49](https://github.com/gaeun1961/foldy/issues/49) | TODO-32 |
