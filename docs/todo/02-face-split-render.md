# TODO - GeoGebra 뷰어 기본 구현 (ShapeScene → 직육면체·전개도)

- 등록 일시: 2026-10-21 09:38 (KST), 2026-10-21 11:35 TODO-1 결과(플랜 A)로 내용 변경
- 작성자: gaeun1961
- 에이전트: Claude Code
- 영역: 3D 뷰어
- 이슈: [#8](https://github.com/gaeun1961/foldy/issues/8) (작업 전 assignee 지정)
- 선행 TODO: TODO-1 (완료, [리포트](../reports/261021-1135-01-geogebra-line-check.md))

> 시작 전에 위 이슈에 자기 자신을 assignee로 지정합니다. 브랜치와 PR은 이 이슈 번호를 씁니다 (`Closes #N`).
> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- `frontend/lab/geogebra.ts`의 실험 코드를 서비스용 `GeoGebraViewer`로 옮겨, ShapeScene을 GeoGebra 직육면체 + 전개도(면 6개)로 그린다

## 완료 조건
- [ ] `frontend/src/viewer/GeoGebraViewer.tsx`가 `ViewerProps`를 구현하고, `scene`이 바뀌면 다시 그린다
- [ ] `docs/02-specs.md` B의 GeoGebra 규칙대로 그린다: 앞면을 밑면으로 `Prism` → `Net(box, s)`, 원래 직육면체는 숨김
- [ ] 전개도 점 → 원래 꼭짓점 인덱스, 전개도 면 → 원래 면 대응 표를 만든다 (TODO-3~6이 이 표를 쓴다)
- [ ] `vertexLabels`를 같은 꼭짓점의 전개도 복사본 모두에 라벨로 표시한다
- [ ] GeoGebra 로딩 중 표시와 로드 실패 메시지가 있다. GeoGebra 버전(codebase)을 고정한다
- [ ] "Made with GeoGebra®" 표기와 geogebra.org 링크가 화면에 있다
- [ ] `viewer/index.ts`의 export를 `GeoGebraViewer`로 바꾸고, `ThreeViewer.tsx`와 `three` 의존성을 지운다

## 참고
- 관련 문서: `docs/02-specs.md` A, B(GeoGebra 규칙), `frontend/lab/geogebra.ts`의 `build()`
- React StrictMode에서 effect가 두 번 돌면 applet이 두 번 inject될 수 있으니 정리(cleanup) 처리 확인
