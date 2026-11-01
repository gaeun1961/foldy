# 독립 교차 심사

- 일시: 2026-11-01
- 이슈: #162
- 상태: 도구 검사와 astra 단독 심사 완료, 1차 모델 미지원으로 교차 합의 대기

## 구현

`evals/judge.py`는 입력 해시와 split을 검증하고 새 작업 폴더에서 두 심사를 순차 실행한다. 두 판정이 다르면 별도 재심을 실행하고 사람 검토로 남긴다. 사진과 결과는 외부 폴더에만 둔다. 정답 은행이나 answers.json을 자동 갱신하지 않는다.

## 검증과 실제 실행

- ruff check/format, 기존 schema/chat/vision_eval/analyze, 새 test_judge 통과. 앱 화면 변경 없음.
- 국내 우선 자료 D01~D04의 기존 agy `gemini-4-argon-low` 실제 결과를 재사용했다. 도형 단독 크롭 입력이며 새 인식 호출이나 문제 전체 평가가 아니다.
- `gpt-6-sol` 4회 모두 `model_not_found`: 현재 ChatGPT 계정에서 지원하지 않는다는 CLI 응답. 다른 모델로 자동 대체하지 않았다.
- `gpt-6-astra` low 단독 심사 4건은 실행했다. 첫 실행에서 정상 겨냥도 cross를 잘못된 배치로 판정하여, 현재 인식기 계약을 심사에 함께 제공하고 프롬프트·계약 해시를 기록하도록 수정했다. 잘못된 기준의 첫 실행 결과를 정답으로 사용하지 않는다.
- 계약을 포함한 재실행은 4건 모두 correct였다. 현재 범위 밖 삼각기둥·종이접기를 올바르게 거절한 결과도 포함된다. 이는 단독 심사 결과이며 교차 합의율·전체 인식 정탐률이 아니다. 모든 항목은 human_approved=false다.
- 모델을 자동 대체하지 않았다. 사용자에게 `gpt-5.6-sol` 대체 여부를 질문한 상태다.
- 자료 선택 사람 확인, 실심사, 정답 확대는 미완료. 기존 연구의 agent-reviewed 후보를 사람 검수 정답으로 바꾸지 않았다.

## 근거

로컬 `D:/_개발/foldy-test-plan/judging-run-01/`(sol 오류), `judging-astra-01/`(계약 누락), `judging-astra-contract-02/`(계약 포함)의 manifest·events·summary·provenance. 사진·심사 원문은 커밋하지 않는다.
