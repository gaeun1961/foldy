# 사진 인식 교차 심사 (#162)

사진·모델 응답·심사 원문은 로컬에만 둔다. `backend/evals/judge.py`는 학습 데이터가 아닌 **검증 후보**를 만든다. 사람 승인 전에는 `answers.json`이나 서비스 정답 은행에 자동 반영하지 않는다.

## 입력과 실행

manifest는 JSON 배열이다. 각 항목은 `id`, `kind`(net/solid/flat/other), `image`(문제 사진), `prediction`(인식 결과 JSON 경로), `split`(development/heldout), 선택 `reference`(정답 참고 이미지)를 갖는다. 경로는 manifest 기준 상대 경로 또는 절대 경로다. prediction은 실제 엔진 결과여야 하며 목 응답을 실측으로 세지 않는다. 같은 원본에서 자른 문제는 같은 split에 둔다.

```sh
python -m evals.judge manifest.json --output evals/results/review-001
```

기본은 입력 검증과 해시만 기록한다. `--run`을 명시하면 로그인된 Codex CLI 사용량을 소비한다. 두 심사는 모두 `gpt-6-astra` low로 실행하며 서로의 답을 주지 않는다. 모델을 사용할 수 없으면 실패를 기록하고 대체하지 않는다. 각 호출은 새 임시 작업 폴더에서 입력 사진과 prediction만 받아 기존 심사와 분리한다. 모델의 도구 호출이 관찰되면 독립 심사로 인정하지 않는다.

## 판정

2026-11-01 사용자 승인으로 기본 심사를 `gpt-6-astra` low 두 세션으로 변경한다. reviewer-1·reviewer-2를 모델명과 분리해 결과가 덮어써지지 않게 한다. 서로의 답을 전달하지 않고 매번 새 임시 폴더에서 실행한다. 같은 모델의 독립 실행이므로 모델 다양성은 확보되지 않는다. `--reuse-first PATH`는 기존 Astra 심사의 입력·프롬프트·계약·스키마 해시와 도구 미사용 로그가 모두 일치할 때만 1차를 재사용한다. 불일치하면 재사용 오류로 남기며 몰래 재호출하지 않는다. 사람 승인 전 정답 은행 반영 금지는 그대로다.

심사에는 현재 `vision_prompt.py`의 계약을 함께 전달한다. 특히 겨냥도만 있는 직육면체의 `net.layout=cross`는 정상 표현이며, 전개도가 사진에 없다는 이유로 오탐 처리하지 않는다. scope는 현재 인식기의 직육면체·정육면체 범위를 기준으로 한다. 향후 지원 범위 확대 평가는 별도이며 현재 정책의 올바른 거절과 혼동하지 않는다. 계약·심사 프롬프트 해시를 실행별로 기록한다.

한 모델만 먼저 실행하려면 `--only-model gpt-6-astra`처럼 지정한다. 이 결과는 partial_review이며 교차 합의가 아니다. 한 모델의 오류로 다른 독립 심사를 생략하지 않으며, 지원되지 않는 모델을 자동 대체하지 않는다.

도형·치수·전개도 배치·라벨·선·범위 여부를 pass/fail/uncertain/not_applicable로 판정한다. 사진에서 확실하지 않은 정보는 uncertain이다. 종합 correct/incorrect/uncertain과 각 항목이 모두 일치해야 합의로 센다. 다르면 astra low에게 두 심사를 주어 재심한다. 재심은 자동 정답 승인이 아니며 human_review로 남긴다. 사람 승인과 실제 뷰어 렌더 검증은 별도다.

출력은 입력 SHA256, 요청 모델, 실행 로그, 오류, 판정, 종류별 합의율이다. 합의율을 정탐률로 부르지 않는다. JSON schema 준수와 로컬 Pydantic 재검증을 모두 거친다. 실패·판정 불명·분모를 빠뜨리지 않는다. heldout을 규칙/퓨샷에 사용하면 그 뒤에는 heldout 성능으로 보고하지 않는다.

CLI 형식: [OpenAI 공식 비대화형 실행 문서](https://learn.chatgpt.com/docs/non-interactive-mode).
