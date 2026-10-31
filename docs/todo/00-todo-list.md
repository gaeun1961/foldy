# TODO List

> 위에서부터 읽는다. **일을 가져갈 때는 "지금 시작 가능"에서 하나 고른다.**  
> 가져갈 때: 그 이슈에 자기 자신을 assignee로 지정하고, 그 줄을 "진행 중"으로 옮긴다.  
> 끝낼 때: TODO 파일을 지우고 "진행 중"에서 빼고, 선행 조건이 풀린 TODO를 "1차 남은 일"에서 "지금 시작 가능"으로 옮긴다 (같은 PR에서).  
> 번호는 TODO 번호(`TODO-3`)이고 GitHub 이슈 번호(`#9`)와 다르다. 이슈는 마일스톤(1차 직육면체 10/28, 2차 정다면체·각기둥·각뿔 10/29, 3차 원기둥·원뿔·구 10/30)으로 묶여 있다.

## 지금 시작 가능

선행 TODO가 모두 끝났고 assignee가 없는 TODO.

**11/1 순서**: TODO-46 배포 → TODO-47 사진 → TODO-48 홀로그램 → TODO-49 데모 영상 → TODO-15 발표 자료·리허설. TODO-50 시연 전 마무리는 틈틈이.

- **TODO-46** [서비스 배포](46-deploy.md) · [#144](https://github.com/gaeun1961/foldy/issues/144) — 행사장에서 주소로 열 수 있게 프론트와 백엔드를 배포한다
- **TODO-47** [실제 학습지 사진 인식 확인](47-photo-real-test.md) · [#145](https://github.com/gaeun1961/foldy/issues/145) — 시연할 학습지 사진을 직접 넣어 돌려 보고 인식 결과와 대비책을 확인한다
- **TODO-48** [홀로그램 실제 기기 테스트](48-hologram-real-test.md) · [#146](https://github.com/gaeun1961/foldy/issues/146) — 휴대폰과 아크릴 피라미드로 홀로그램 모드를 실제로 확인한다
- **TODO-50** [시연 전 마무리](50-pre-demo-polish.md) · [#148](https://github.com/gaeun1961/foldy/issues/148) — 시연 전에 눈에 띄는 남은 것들을 정리한다

## 진행 중

assignee가 있는 TODO. 다른 사람은 건드리지 않는다.

| TODO | 이슈 | 담당자 |
|---|---|---|
| **TODO-15** [시연용 문제 선정, 데모 시나리오, 발표 자료](15-demo-presentation.md) | [#21](https://github.com/gaeun1961/foldy/issues/21) | gaeun1961 |

## 1차 남은 일

선행 TODO가 끝나지 않아 아직 시작할 수 없는 1차 TODO. 선행이 끝나면 "지금 시작 가능"으로 옮긴다.

| TODO | 이슈 | 선행 |
|---|---|---|
| **TODO-49** [데모 영상 찍기](49-demo-video.md) | [#147](https://github.com/gaeun1961/foldy/issues/147) | TODO-46, TODO-47, TODO-48 |

## 버그 (담당 대기)

재현·원인·고치는 방향을 적어 둔 버그. 가져갈 때 `[버그]` 이슈를 만들고 assignee를 건다.

- **B1** [3D 위에서 휠을 굴리면 책이 사라지고 책상만 보임](B1-viewer-wheel-zoom.md) · [#128](https://github.com/gaeun1961/foldy/issues/128) — 3D: 카메라 거리 제한 없음
- **B3** [사진을 전개도에 맞춰 키우면 3D 장면 전체가 뿌옇게 보임](B3-viewer-fog-with-photo.md) · [#129](https://github.com/gaeun1961/foldy/issues/129) — 3D: 안개 거리가 도형 크기 기준
- **B2** [옆으로 찍은 사진은 전개도 칸 밑 사진과 인식한 전개도가 어긋남](B2-photo-overlay-rotated.md) — UI: 사진 돌리기(worksheets.md W5)

## 모바일 웹 (시기 미정)

휴대폰으로 학습지를 찍어 쓰는 작업 M1~M5. 계획·변경 지도·합칠 때 규칙은 [specs/mobile.md](../specs/mobile.md) ([#126](https://github.com/gaeun1961/foldy/issues/126)). 시기가 정해지면 이슈와 TODO 파일을 만든다.
다음 단계 W1~W4(팀 테스트용 인식 엔진 `agy`, 보관함, 인식 대기 화면)는 [specs/worksheets.md](../specs/worksheets.md) ([#127](https://github.com/gaeun1961/foldy/issues/127), 계약 [#125](https://github.com/gaeun1961/foldy/issues/125), 홀로그램 사진 [#130](https://github.com/gaeun1961/foldy/issues/130)).

## 나중에 (3차)

2차(정다면체 TODO-16, 각기둥·각뿔 TODO-31)는 시연을 위해 1차보다 먼저 끝냈다(사용자 결정, 리포트 T16·T31). 3차는 아직 가져가지 않는다. 이슈는 "not planned"로 닫혀 있고, 시작할 때 다시 연다.

| 단계 | TODO | 이슈 | 선행 |
|---|---|---|---|
