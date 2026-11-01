# 독립 교차 심사

- 일시: 2026-11-01
- 이슈: #162
- 상태: 도구 구현·검사 완료, 지정 모델 미지원으로 실심사 대기

## 구현

`evals/judge.py`는 입력 해시와 split을 검증하고 새 작업 폴더에서 두 심사를 순차 실행한다. 두 판정이 다르면 별도 재심을 실행하고 사람 검토로 남긴다. 사진과 결과는 외부 폴더에만 둔다. 정답 은행이나 answers.json을 자동 갱신하지 않는다.

## 검증과 실제 실행

- ruff check/format, 기존 schema/chat/vision_eval/analyze, 새 test_judge 통과. 앱 화면 변경 없음.
- 국내 우선 자료 D01~D04의 기존 agy `gemini-4-argon-low` 실제 결과를 재사용했다. 도형 단독 크롭 입력이며 새 인식 호출이나 문제 전체 평가가 아니다.
- `gpt-6-sol` 4회 모두 `model_not_found`: 현재 ChatGPT 계정에서 지원하지 않는다는 CLI 응답. 독립 2차 심사는 실행하지 않았으며 정탐률·교차 합의 결과는 없다.
- 모델을 자동 대체하지 않았다. 사용자에게 `gpt-5.6-sol` 대체 여부를 질문한 상태다.
- 자료 선택 사람 확인, 실심사, 정답 확대는 미완료. 기존 연구의 agent-reviewed 후보를 사람 검수 정답으로 바꾸지 않았다.

## 근거

로컬 `D:/_개발/foldy-test-plan/judging-run-01/`의 manifest·events·summary. 사진·심사 원문은 커밋하지 않는다.
