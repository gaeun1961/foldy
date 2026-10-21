# TODO - 비전 LLM 연결

- 등록 일시: 2026-10-21 09:16 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 진행 시점: LLM API 키 준비 후 (AI 담당)

> 완료된 TODO는 이 파일을 삭제하고, `docs/reports/`에 작업 기록을 남깁니다.

## 목표
- 학습지 사진을 비전 LLM으로 ShapeScene JSON으로 변환해 `POST /analyze`가 실제 결과를 돌려주게 한다

## 요구사항
- `backend/app/ai/vision.py`의 `analyze_image`에서 호출, 키는 `LLM_API_KEY` 환경 변수
- 응답은 `ShapeScene.model_validate`로 검증, 실패하면 에러를 돌려 frontend가 수동 입력으로 넘어가게 한다
- 꼭짓점 인덱스 규칙(`docs/02-specs.md`)에 맞게 라벨을 배치하도록 프롬프트 작성

## 작업 요약
- 프롬프트와 출력 형식 작성, 실패 응답 형식을 UI 담당과 합의
- 학습지 예시 사진 몇 장으로 인식 결과 확인

## 선행조건
- LLM API 키 발급

## 참고
- 관련 문서: `docs/02-specs.md` C. ShapeScene, D. API
- todo-list 한 줄 요약: /analyze 에 비전 LLM 연결, 실패 시 수동 입력 경로로
