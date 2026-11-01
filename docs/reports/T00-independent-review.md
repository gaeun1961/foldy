# 독립 교차 심사

- 일시: 2026-11-01
- 이슈: #162
- 상태: 사용자 승인한 Astra low 두 독립 심사·재심 완료. 사람 검수와 정답 확대 대기

## 구현

`evals/judge.py`는 입력 해시와 split을 검증하고 새 작업 폴더에서 두 심사를 순차 실행한다. 두 판정이 다르면 별도 재심을 실행하고 사람 검토로 남긴다. 사진과 결과는 외부 폴더에만 둔다. 정답 은행이나 answers.json을 자동 갱신하지 않는다.

## 검증과 실제 실행

- ruff check/format, 기존 schema/chat/vision_eval/analyze, 새 test_judge 통과. 앱 화면 변경 없음.
- 국내/Kakao/PDF가 섞인 개발 표본 D01~D04의 기존 agy `gemini-4-argon-low` 실제 결과를 재사용했다. 도형 단독 크롭 입력이며 새 인식 호출이나 문제 전체 평가가 아니다.
- `gpt-6-sol` 4회 모두 `model_not_found`: 현재 ChatGPT 계정에서 지원하지 않는다는 CLI 응답. 다른 모델로 자동 대체하지 않았다.
- `gpt-6-astra` low 단독 심사 4건은 실행했다. 첫 실행에서 정상 겨냥도 cross를 잘못된 배치로 판정하여, 현재 인식기 계약을 심사에 함께 제공하고 프롬프트·계약 해시를 기록하도록 수정했다. 잘못된 기준의 첫 실행 결과를 정답으로 사용하지 않는다.
- 계약을 포함한 재실행은 4건 모두 correct였다. 현재 범위 밖 삼각기둥·종이접기를 올바르게 거절한 결과도 포함된다. 이는 단독 심사 결과이며 교차 합의율·전체 인식 정탐률이 아니다. 모든 항목은 human_approved=false다.
- 모델을 자동 대체하지 않았다. 사용자에게 `gpt-5.6-sol` 대체 여부를 질문한 상태다.
- 자료 선택 사람 확인, 두 모델 독립 교차 심사, 정답 확대는 미완료. 기존 연구의 agent-reviewed 후보를 사람 검수 정답으로 바꾸지 않았다.

## 국내 우선 4개 원본 재확인

기존 D01~D04는 국내 우선 4개가 아니다. `국내학습지_우선검토/먼저볼문제`의 지정 PNG 4개를 K01~K04로 별도 등록했다. 원본 전체 이미지를 기존 agy `gemini-4-argon-low`에 넣고 가장 앞선 문제 하나를 읽는 현재 계약으로 4회 호출했다. 모두 scene을 반환했으며 호출 시간은 순서대로 25.578초, 24.982초, 26.040초, 21.317초다. 이는 응답 성공이며 정답 확인이 아니다.

| 표본 | Astra low 단독 판정 | 관찰 |
|---|---|---|
| K01 직육면체 치수와 수직면 | incorrect | 치수·배치는 pass, 원문자 ㉮를 가로 기록한 라벨 보존 실패 지적 |
| K02 정육면체 꼭짓점과 겹치는 선분 | correct | 04번 문제의 배치·색칠·꼭짓점 라벨 pass |
| K03 보충 수직면과 겹치는 선분 | correct | 16번 문제의 배치·비율·라벨 pass |
| K04 기본 만나는 점과 선분 | correct | 배치·추정 비율·꼭짓점 라벨 pass |

4개 모두 development이며 `partial_review`, `human_approved=false`를 유지한다. correct 3개·incorrect 1개는 한 모델의 판정 분포이며 정탐률 또는 교차 합의율이 아니다. 그림에 길이가 없는 K03·K04의 치수는 비율 추정이다. 실제 뷰어 렌더와 문제 풀이 정답 검증도 수행하지 않았다.

라벨 실패 유형 후보는 원문자 외곽의 누락이다. 원문자와 일반 글자를 구분해 보존하는 규칙을 검토할 수 있으나, 사람 확인과 두 번째 독립 심사 전에는 프롬프트·정답 은행에 반영하지 않는다. 이번 마무리에서는 추가 모델 호출이나 규칙 변경을 하지 않았다.

## 근거

## Astra 두 독립 세션으로 변경 (2026-11-01)

사용자가 지정 모델 미지원에 대해 Astra 두 심사를 승인했다. 기존 1차 8건의 입력·프롬프트·계약·스키마 해시 및 도구 미사용 완료 로그를 검증해 재사용하고, 서로의 답을 받지 않는 새 2차 8건과 불일치 재심 3건을 실행했다. 새 인식 호출은 하지 않았다. 같은 모델이므로 모델 다양성을 확보한 검증은 아니다.

| 표본 | 두 심사 | 재심 | 사람 확인할 것 |
|---|---|---|---|
| K01 | incorrect / correct | incorrect | 원문자 ㉮를 가로 보존해도 되는지: 계약상 그대로 기록해야 함 |
| K02 | correct 합의 | 없음 | 정답 후보의 문제·라벨 확인 |
| K03 | correct / correct, lines 항목 불일치 | correct | 추가 선분 없음은 not_applicable인지 확인 |
| K04 | correct 합의 | 없음 | 치수가 없는 그림의 추정 비율 확인 |
| D01 | correct / correct, lines 항목 불일치 | correct | K01과 같은 원본의 크롭. 원문자 판단도 함께 확인 |
| D02 | correct 합의 | 없음 | 겨냥도·cross와 12×11×4 확인 |
| D03 | correct 합의 | 없음 | 평면 종이접기 거절 확인 |
| D04 | correct 합의 | 없음 | 현재 계약 밖 삼각기둥 거절 확인 |

완전 항목 합의 5건, 사람 검토 3건이며 실행 오류는 없다. 8입력은 고유 원본 7개이고 모두 development다. 정탐률로 해석하지 않는다. 모든 human_approved는 false이며 answers.json/서비스 프롬프트는 변경하지 않았다. 원문자 보존, 추가 선분이 없는 경우의 판정 통일을 규칙 후보로 정리한다. 최초 재사용 검증은 Windows 줄바꿈을 포함한 스키마 파일 해시와 문자열 해시 차이로 실패했으나 실제 생성 바이트의 SHA256 비교로 수정했고, 이미 끝난 2차 심사는 재호출하지 않고 결합했다.

backend ruff check/format, schema/chat/vision_eval/analyze와 test_judge 통과. test_judge는 같은 모델의 서로 다른 결과 폴더, 기존 심사 재사용, 프롬프트 변조 거절을 검증한다. 실행 근거는 로컬 `priority-astra-pair-01/`, `development-astra-pair-01/`의 두 reviewer 폴더·재심·summary·counts다. 원래 약 70장 전체 평가, 사람의 자료/정답 검수와 answers.json 확대는 미완료라 #162를 유지한다.

로컬 `D:/_개발/foldy-test-plan/judging-run-01/`(sol 오류), `judging-astra-01/`(계약 누락), `judging-astra-contract-02/`(계약 포함)의 manifest·events·summary·provenance. 사진·심사 원문은 커밋하지 않는다.

국내 우선 원본 실행은 로컬 `D:/_개발/foldy-test-plan/priority-recognition-01/`(실제 인식), `priority-astra-01/`(단독 심사)의 manifest·summary·review·provenance에 보관했다.
