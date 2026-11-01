# Bank50 A: R13·R14·R15 문제 단위 사례

- 일시: 2026-11-01 KST
- 관련: #162; 사용자 승인에 따른 제한시간 병렬 실험
- 워크트리: `experiment/162-bank50-data-a`

## 결과

기존 D/E/H 24문제와 다른 고유 문제 13개를 선정해 문제 사진과 지정 도형 사진 26장을 준비했다. 사진·라벨·출처 해시는 저장소 밖 `D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50/batches/a`에만 저장했다. 모든 사례는 `demo_development`이며 미사용 평가나 일반화 검증으로 주장하지 않는다.

원본 페이지와 크롭을 직접 확인했다. 문제번호 하나를 한 사례로 세었고 선택지 여러 개를 수량으로 부풀리지 않았다. 13·14처럼 같은 그림을 공유하면 한 문제만 선정했다. 문제 전체와 지정 도형이 다른 경우 `designated_target_note`에 명시했다.

## 교육 후보

`labels.json`의 Scene 후보 13개는 모두 현재 Pydantic 계약 검증을 통과했다. 이 중 9개만 `approved_for_prompt=true`다. 이는 에이전트 시각 검수 후 교육 예시 후보 사용을 허용한다는 뜻이며, 사람 승인 또는 실제 렌더링 성공을 의미하지 않는다.

A02·A08·A09는 입체의 색칠된 면 의미, A13은 주사위 면 숫자를 현재 후보 Scene에 보존하지 못해 부분 후보로 남겼다. 승인 후보 A01·A03·A04·A05·A06·A07·A10·A11·A12는 치수 미상일 때 정규화 가정을 명시했고, 인쇄된 꼭짓점과 전개도 면 배치를 보존했다. 빈 답안칸을 추측해 채우지 않았다.

## 재현·검증

- 실행: `python backend/evals/bank50_a.py` (Pillow 필요)
- 원본 위치·hash, 페이지·문제번호, crop 좌표는 `cases.json`에 기록
- `validation.json`: 13/13 schema 통과, 교육 후보 승인9/13
- 스크립트 ruff check 및 format 확인
- 실제 뷰어 렌더링, API 비교 결과는 상위 실험 담당자가 별도 통합

서비스 코드·ShapeScene 계약은 수정하지 않았다. 사진을 git에 넣지 않았고 커밋·PR을 만들지 않았다.

## C 보강 배치

설명 예시를 고유 문제 수에서 분리하기 위해 C01(R15 p001 문제03), C02(R14 p002 문제10) 두 고유 문제를 추가했다. 기존 A13/D/E/H와 중복되지 않는다. 원본·크롭 직접 검수, Scene2/2 계약 검증 통과. C01은 인쇄9×7×3cm, C02는치수미상1×1×1.5가정이다. `backend/evals/bank50_c.py`가A준비함수를재사용하며 사진·라벨은외부`7. bank50/batches/c`에저장한다. 두후보approved_for_prompt=true이며실제렌더링승인과구분한다.

## 최종 폴더 정리

`bank50_package.py`로 고유 문제50개와 참고 설명 예시D04/E05를 분리했다. 총52자료 사진104장을 `1. fewshot/{ID}`에서 보존·검증하고, 각각의 검수라벨과출처를 `2. teaching data/{ID}/bank50.reviewed.json`, `bank50.provenance.json`으로 추가했다. 교사 Scene 승인35개는 모두본50문제에속한다. `7. bank50/manifest.json`, `scene-bank.json`과 `2. teaching data/scene-bank-bank50.json`이최종목차다. 동일파일은hash검증만하고다르면hash접미사파일로추가하여기존자료를덮어쓰지않았다. 동결된source배치를수정하지않았다.
