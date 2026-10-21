# TODO - 면 위 선 긋기

- 등록 일시: 2026-10-21 09:16 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 진행 시점: 뷰어 플랜 A/B 결정 후 (3D 담당)

> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- ShapeScene의 `lines`와 `vertexLabels`를 입체와 전개도에 함께 그려, 접고 펼칠 때 선 위치가 이어지게 한다

## 요구사항
- 끝점은 `{ vertex }` 또는 `{ edge: [i, j], t }` (`docs/02-specs.md`)
- 접기 애니메이션 중에도 선이 면을 따라 움직인다
- 꼭짓점 라벨(ㄱ, ㄴ, ...) 표시

## 작업 요약
- 끝점 → 3D 좌표 변환 함수 작성 후 선분과 라벨 표시

## 선행조건
- `01-geogebra-line-test.md` 결정

## 참고
- 관련 문서: `docs/02-specs.md` C. ShapeScene
- todo-list 한 줄 요약: 면 위 선분·꼭짓점 라벨을 입체와 전개도에 함께 표시
