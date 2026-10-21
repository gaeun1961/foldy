# 작업 기록 - GeoGebra 선 연동 테스트 (TODO-1, 최종 결정 플랜 B)

- 일시: 2026-10-21 11:35 (KST)
- 작성자: gaeun1961
- 에이전트: Claude Code
- 작업 유형: 테스트 / 결정

## 요약
- **최종 결정: 플랜 B (three.js 직접 구현)**
- 기술적으로는 GeoGebra로도 된다. 아래 표처럼 핵심 항목(선이 펼침을 따라오는가)은 `Net`이 만든 전개도 점으로 선을 정의하면 슬라이더 전 구간에서 정확히 따라왔다. 그래서 처음에는 플랜 A로 정했다가, 아래 이유로 B로 바꿨다
- 실험 페이지: `frontend/lab/geogebra.html` (+ `geogebra.ts`), 목 데이터 직육면체 4×2×3 + 선 4개. 실험 기록으로만 남기고 서비스에는 쓰지 않는다

## 최종 결정: 플랜 B
### 이유
- **라이선스**: GeoGebra는 상업적으로 쓰려면 별도 라이선스가 필요하다. foldy는 메이커톤 뒤에 앱·웹 서비스로 출시할 가능성이 있다
- **네트워크**: GeoGebra는 CDN에서 불러오므로 행사장 네트워크가 끊기면 뷰어가 뜨지 않는다. three.js는 빌드에 포함되어 오프라인에서도 뜬다
- **범위**: 1차 범위가 직육면체·정육면체와 cross 전개도 하나뿐이라, 면 6개의 회전을 직접 구현하는 것도 현실적이다

### GeoGebra 실험에서 얻어서 three.js 구현에도 그대로 쓰는 것
- **전개도 배치**: 앞면을 고정하고 [왼][앞][오][뒤]를 한 줄로, 위·아래를 앞면에 붙인다 (뒷면은 오른쪽 면에 붙음). 02-specs C의 `cross`와 같다
- **슬라이더 방향**: `s` 0 = 직육면체(접힘), 1 = 전개도(펼침)
- **꼭짓점 복사본**: 펼치면 한 꼭짓점이 전개도에서 최대 3곳으로 나뉜다 (예: 꼭짓점 6). 라벨·색·하이라이트는 복사본 모두에 적용한다
- **두 면에 걸친 선**: ShapeScene에서 면별 선분으로 나눠 받는다. 펼치면 잘린 모서리에서 끊어지는 게 맞다
- **선이 따라오는 원리**: 선을 원래 직육면체 좌표가 아니라 **그 선이 놓인 면 기준**으로 정의해야 펼침을 따라온다. three.js에서는 선을 면 메시의 자식으로 붙이는 것으로 같은 효과를 낸다

## 확인 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| (핵심) 면 위 선분이 `Net` + 슬라이더(0~1)로 펼칠 때 따라오는가 | **우회 가능** | 원래 꼭짓점으로 그린 선(회색 점선)은 제자리에 남는다. `Net`이 만든 전개도 점(D, E, I, H …)으로 끝점을 정의하면 따라온다. s를 0~1까지 0.05 간격으로 바꿔 보며 끝점과 자기 면 평면의 거리를 쟀고, 최대 7e-17이었다 |
| 따라오지 않을 때 우회 방법 | **가능** | 선을 다시 계산해서 그리지 않아도 된다. 끝점을 `A + t (B - A)` 같은 의존 객체로 만들면 GeoGebra가 알아서 갱신한다 |
| 두 면에 걸친 선 | **우회 가능** | 면별 선분 두 개로 나누면 된다 (예: 앞면 → 모서리 1-5 중점 → 오른쪽 면). 펼치면 잘린 모서리에서 끊어진다. 종이 전개도와 같은 동작이고, ShapeScene 계약("두 끝점은 같은 면")도 그대로 쓸 수 있다 |
| JS에서 슬라이더 값 바꾸기 | **가능** | `api.setValue('s', v)`. 바꾼 값은 `registerObjectUpdateListener`로 화면에 다시 반영된다 (0.37을 넣어 확인) |
| 특정 꼭짓점 색 바꾸기 | **가능** | `api.setColor`, `api.setPointSize`. 한 꼭짓점이 전개도에서 최대 3개로 복사되므로(예: 꼭짓점 6 → I, J, P), 대응 표로 복사본을 모두 칠한다 |
| 꼭짓점 클릭 이벤트 | **가능** | `api.registerClickListener`로 클릭한 객체 이름(`L`, `edgeFL`, `faceFGML`, `line_0` 등)을 받았다. 대응 표로 `L` → 꼭짓점 7처럼 바꿀 수 있다 |
| ShapeScene JSON → GeoGebra 명령 변환 | **가능** | 약 60줄이다 (`build()`). 꼭짓점 8개 → `Prism` → `Net`. 전개도 점은 s = 0에서 좌표를 비교해 원래 꼭짓점에 대응시키고, 면은 `getCommandString(name, false)`를 파싱해서 찾는다. 한국어 라벨(ㄱ, ㄴ …)도 caption으로 잘 나온다 |
| 전개도 배치 (`cross`) | **가능** | 앞면을 밑면으로, 모서리 1-5부터 `Prism(V_1, V_5, V_4, V_0, V_2)`로 만들면 [왼][앞][오][뒤] 한 줄에 위/아래가 앞면에 붙는다. 펼친 면의 중심 좌표로 확인했고, 02-specs의 cross와 같다 |
| 라이선스 | **조건부 가능** | [geogebra.org/license](https://www.geogebra.org/license): 비상업 용도는 복사·배포·사용이 자유이고, "Made with GeoGebra®" 표기와 geogebra.org 링크가 필요하다. 학교·학업 목적은 비상업으로 본다. 상업 용도(판매, 광고·후원 수익 등)는 별도 라이선스가 필요하다. 공개 저장소는 GeoGebra 파일을 넣지 않고 CDN에서 불러오면 문제없다. 메이커톤 상금이나 후원이 상업 용도인지는 라이선스 문서에 직접 나오지 않는다. 확실히 하려면 office@geogebra.org에 문의해야 한다 |
| 로딩 속도 | 참고 | 헤드리스 Edge에서 페이지를 연 뒤 applet 준비까지 2.3~5.1초가 걸렸다 (캐시 상태는 통제하지 않음) |

## 변경 범위
- `frontend/lab/` 추가 (실험 페이지, 서비스 빌드에는 들어가지 않음, 서비스에 쓰지 않음)
- `docs/02-specs.md`: 3D 스택은 three.js 유지, "three.js 뷰어 규칙" 절 추가 (위 실험 결과 반영)
- `docs/01-folder-architecture.md`: `frontend/lab/` 책임과 의존 규칙 추가
- `docs/todo/`: TODO-1 삭제, TODO-2 제목을 "three.js 면 6개 계층 구조 렌더링"으로 변경(이슈 #8도), TODO-3~6을 three.js 기준으로 다시 씀, TODO-15에 행사장 네트워크 점검(LLM API) 추가

## 주요 변경 파일
- `frontend/lab/geogebra.html`, `frontend/lab/geogebra.ts`
- `docs/02-specs.md`, `docs/01-folder-architecture.md`
- `docs/todo/00-todo-list.md`, `docs/todo/02~06-*.md`, `docs/todo/15-demo-presentation.md`

## 리스크/이슈
- **직접 구현 부담**: 접기(면 회전 계층), 클릭(레이캐스팅)을 직접 만들어야 한다. 1차 범위가 cross 전개도 하나뿐이라 계층 구조를 고정해서 범위를 줄였다 (02-specs B)
- GeoGebra 실험 페이지(`frontend/lab/geogebra.*`)는 여전히 CDN을 쓰지만 서비스와 무관하다

## 다음 작업
- TODO-2 (#8): three.js 면 6개 계층 구조 렌더링 (이제 바로 시작 가능)

## 참고
- 관련 문서: 이슈 #7, `docs/02-specs.md` B(three.js 뷰어 규칙)
- GeoGebra Net 명령: https://geogebra.github.io/docs/manual/en/commands/Net/
- GeoGebra 라이선스: https://www.geogebra.org/license
