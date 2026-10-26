# 작업 기록 - 직육면체 부피 시각화

- 일시: 2026-10-26 18:35 (KST)
- 작성자: kimdaeone
- 에이전트: Claude Code
- 작업 유형: 기능 추가

## 요약
- "설명 모드"를 뷰어에 두고(`ViewerProps.lesson`), 첫 설명으로 **부피**를 만들었다. 단위 정육면체를 바닥 층부터 한 층씩 쌓고, 다 쌓은 뒤 멈추면 `가로 × 세로 × 높이 = 4 × 2 × 3 = 24`를 보여준다
- 설명 모드는 접기와 같은 틀이다: 뷰어는 `progress` 값만 받고, 단계(층)·속도·단계 사이 멈춤·이징은 UI가 만든다. 겉넓이(TODO-25)·위치 관계(TODO-28)·닮음(TODO-29)·피타고라스(TODO-30)는 이 틀에 종류 하나씩 더한다

## 변경 범위
- 스펙: `viewer.md`에 `lesson` prop과 "설명 모드" 절(구조, 숨기기·카메라, 단계 나누기, 부피 규칙), `ui.md` 화면 배치 8번(설명 조작·배지·공식 위치), `01-folder-architecture.md`
- 뷰어: `viewer/lessons/`(새 폴더) — `data.ts`(종류·단계 수·공식, three.js 없음), `volumeLayout.ts`(조각 배치, three.js 없음), `volume.ts`(조각 메시·강조), `index.ts`(`buildLesson`), `lessons.test.ts`. `ThreeViewer.tsx`는 설명 물체를 면 트리 루트에 붙이고 설명 중 면을 반투명으로, 꼭짓점·모서리 색·점선을 숨기고, 카메라를 입체 범위로 당긴다
- UI: `LessonControls.tsx`(종류 버튼, 속도, 처음으로·이전·다음·보기, 공식 줄), `lessonStatus.ts`(배지 문구), `player.ts`(접기 패널의 애니메이션 함수를 빼내 공용으로. `FoldControls.tsx`는 이것을 쓰도록 바꿈), `App.tsx`(설명을 고르면 입체로 접고 접기 패널을 설명 조작으로 바꿈), `index.css`
- `package.json`: `npm test`에 `lessons.test.ts` 추가

## 주요 변경 파일
- `frontend/src/viewer/lessons/{data,index,volume,volumeLayout,lessons.test}.ts`, `frontend/src/viewer/ThreeViewer.tsx`, `frontend/src/viewer/index.ts`
- `frontend/src/ui/{LessonControls.tsx,lessonStatus.ts,player.ts,FoldControls.tsx,App.tsx}`, `frontend/src/index.css`, `frontend/package.json`
- `docs/specs/viewer.md`, `docs/specs/ui.md`, `docs/01-folder-architecture.md`

## 결정
- **정수가 아닌 치수**: 1짜리 조각으로 채우고 남는 길이는 그만큼 얇은 조각 하나로 둔다 (2.5 → 1, 1, 0.5). 조각 부피의 합이 정확히 가로×세로×높이가 되고, 공식의 값은 소수 둘째 자리까지 보여준다. 반올림해서 정수로 바꾸지 않는다 (학습지 치수를 그대로 보여주는 게 맞다)
- **쌓는 순서**: 층 안에서는 뒤 왼쪽부터 앞 오른쪽으로. 새 조각이 앞에 나타나 가려지지 않는다. 지금 쌓이는 층은 연한 노랑, 다 쌓은 층은 흰색 (ui.md 색 기준). 층 사이에 멈추면 마지막 층을 계속 강조하고 다 쌓으면 끈다 (단계별 접기와 같은 규칙)
- **설명 중 화면**: 면은 투명도 0.12(안이 보이게, `depthWrite` 끔), 꼭짓점 표시점·라벨·맞닿는 모서리 색·가려진 모서리 점선은 숨긴다. 면 위 선분(분홍)은 문제의 일부라 남긴다. 보기 옵션 값은 건드리지 않는다
- **바로 세우기**: 처음에는 설명 물체를 눕힌 자세의 면 트리에 그대로 붙였더니 층이 옆(위쪽)으로 쌓였다. 전개도를 바닥에 눕히면 입체는 앞면을 아래로 두고 눕기 때문이다. 설명 중에는 면 트리 루트의 회전을 풀고 밑면을 바닥에 두어(`standUp`) 층이 위로 쌓이게 했고, 끄면 `layOnFloor`로 되돌린다
- **카메라**: 평소에는 전개도까지 담는 범위라 입체가 작게 보여서, 설명 중에는 입체 범위(×1.15)에 맞춰 당기고 끄면 되돌린다. 보는 방향은 유지한다 (`resize`와 같은 계산을 `fit` 범위만 바꿔 다시 부른다)
- **공식 표시 위치**: 3D 뷰 위가 아니라 조작 패널의 버튼 아래 한 줄. 애니메이션이 끝나고 멈춘 뒤에만 보인다 (친절한 설명 원칙). 단계 사이 멈춤에서는 보이지 않는다
- **애니메이션 공용화**: `FoldControls`의 `play`를 `player.ts`의 `animate(from, targets, msPerUnit, pauseMs, onChange, onDone)`로 빼냈다. 속도표(`SPEEDS`)도 같이 옮겨 접기와 설명이 같은 속도를 쓴다
- `lessonStatus`는 `foldStatus.ts`에 넣지 않고 따로 뒀다. `foldStatus.test.ts`가 Node로 바로 도는데 뷰어 `index.ts`(React 컴포넌트)를 끌어오면 깨진다

## 확인 (npm run dev, Chrome)
- "부피"를 누르면 입체로 접히고 면이 투명해지며 배지 "부피 · 시작 전", 점 3개, 안내 "한 층씩 쌓아 볼까요". 카메라가 입체에 맞게 당겨진다
- "부피 보기 ▶": 층마다 조각이 하나씩 나타나고(현재 층 노랑), 층 사이에 멈춘다. 끝나면 "✔ 부피를 다 봤어요"와 공식 줄 `가로 × 세로 × 높이 = 4 × 2 × 3 = 24`
- 다음 단계·이전 단계·처음으로·속도가 접기 패널과 같이 동작한다. 같은 버튼을 다시 누르면 설명이 꺼지고 접기 패널·원래 카메라로 돌아온다. 콘솔 오류 없음
- `npm test`: 4×2×3(24개, 모두 1), 2.5×1×1.5(6개, 부피 합 3.75), 층 진행률, 단계 수, 공식 문구

## 리스크/이슈
- `ThreeViewer.tsx`를 같이 고치는 PR(#56 공용 렌더러, #57 선 긋기)과 충돌할 수 있다. 이 PR의 변경은 재질(`look`에 투명도), `apply` 안의 설명 분기, 카메라 `fit`, 정리 한 줄이라 그 자리로 한정된다
- 설명 중 면이 투명하고 `depthWrite`를 끄므로, 면끼리의 앞뒤는 그리는 순서에 따른다. 조각이 안에 있어서 눈에 띄는 문제는 없었다
- 치수가 크면(예: 10×10×10) 조각 1000개를 메시로 그린다. 그 정도까지는 괜찮았고, 더 크면 `InstancedMesh`로 바꾼다

## 다음 작업
- TODO-25 겉넓이: 같은 틀에 `'surface-area'`를 더한다 (마주 보는 면 쌍 칠하기 → `2 × (ab + bc + ca)`)
- TODO-29 닮음은 25·26의 조각·면 칠하기를 재사용한다

## 참고
- 관련 문서: `docs/specs/viewer.md` "설명 모드", `docs/specs/ui.md` 화면 배치 8번·친절한 설명 원칙
