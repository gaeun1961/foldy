"""실측 원문을 보존하면서 확인된 오류 기전과 가설을 구분한다."""

import html
import json
import os
from pathlib import Path
from urllib.parse import quote

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷")
FLOW = ROOT / "8. flow10"
OUT = FLOW / "reports/error-analysis.html"


def url(path):
    return quote(os.path.relpath(path, OUT.parent).replace("\\", "/"), safe="/.")


def figure(path, caption):
    return f'<figure><a href="{url(path)}"><img loading="lazy" src="{url(path)}" alt="{html.escape(caption)}"></a><figcaption>{caption}</figcaption></figure>'


def main():
    cases = [
        (
            "H01",
            "입력에서 잘리고, 생성에서도 연결을 틀림",
            "확인된 두 단계 오류",
            "현재 CV는 문제의 일부 조각을 후보로 만들었습니다. 현재 형상 모델은 그 조각만 받았고, 문제 전체를 읽은 OCR 결과는 나중에 붙었습니다. 반환 전개도는 면 1개뿐이고 실제 4×7×6 대신 2.5×1×1.2였습니다.",
            "실험 경로에는 문제 전체가 들어가 4×7×6을 회복했습니다. 그러나 면 크기를 1×2 같은 별도 단위로 작성하고 윗면 부착 위치도 틀렸습니다. 길이 기호를 꼭짓점 라벨로 넣은 오류도 있습니다. 따라서 CV만 고치면 해결된다고 볼 수 없습니다.",
            "잘림은 입력 증거로 확인됩니다. 면 좌표 오류도 확정입니다. 작은 모델의 한계인지, 예시 구성 때문인지는 이번 1회 관측으로 구분할 수 없습니다.",
            "H01-proposed-solid.png",
        ),
        (
            "A04",
            "치수와 전개도의 좌표 단위가 서로 다름",
            "생성된 기하의 내부 불일치",
            "현재 경로는 이 문제에서 3×6×5 치수와 면 배치를 맞혔습니다. 실험 경로는 size를 6×3×5로 읽고도 faces를 3×2·2×2로 적었습니다. 면들이 부분적으로만 접해 실제 접힘에서 틈과 엇갈림이 생깁니다.",
            "전체 문제를 이미 제공했으므로 단순한 CV 잘림만으로 설명되지 않습니다. 생성된 JSON 안에서 size와 faces가 일치하지 않는 것이 직접적인 실패 기전입니다.",
            "치수·연결을 결정론적으로 검사해 걸러야 합니다. 좌표를 임의로 고쳐 성공으로 만드는 것은 원문 복원 검증이 아닙니다.",
            "A04-proposed-solid.png",
        ),
        (
            "H03",
            "지원 가능한 전개도를 잘못 거부함",
            "도형 종류와 문제 질문을 혼동",
            "실험 응답은 “전체 종이의 가로와 세로를 구하는 문제”라는 이유로 unsupported를 반환했습니다. 하지만 원문에는 정육면체 전개도와 한 변 7cm가 명시되어 있습니다. 무엇을 묻는지와 어떤 도형을 그릴 수 있는지는 별개입니다.",
            "현재 경로도 정답은 아닙니다. 원본 (21,0)에 있어야 할 면을 누락하고 (14,14)에 면을 추가했습니다. 실제 렌더에서도 열린 면이 확인됐습니다.",
            "과잉 거부와 면 배치 오류는 확인됐습니다. “종이”라는 표현이나 혼재된 지원 범위 지시가 거부를 유도했는지는 비교 실험이 필요한 가설입니다.",
            "H03-current-0-solid.png",
        ),
        (
            "C01",
            "인식은 맞았지만 JSON 계약에서 탈락함",
            "형식 오류 — 시각 인식 실패와 구분",
            "현재 API의 원문 응답은 cuboid와 9×7×3을 정확히 반환했습니다. 다만 vertexLabels가 길이 8의 배열이 아니라 null이었습니다. Pydantic 검증이 이를 거절해 사용자에게는 “도형을 찾지 못했어요”라는 422가 전달됐습니다.",
            "실험 경로는 [null,…,null] 8개를 반환해 계약을 통과했고, 실제로 닫힌 상자가 만들어졌습니다. 이전 보고서의 현재 경로 “인식 실패”는 여기서는 형식 검증 실패로 더 정확하게 설명해야 합니다.",
            "이 경우 null을 “라벨이 관측되지 않음”으로 처리할 수 있는지 계약을 정한 뒤 제한적으로 정규화하거나, 형식만 재요청할 수 있습니다. 모든 null·필드 누락을 무조건 자동 보정하는 방식은 피해야 합니다.",
            "C01-proposed-solid.png",
        ),
        (
            "E06",
            "모델이 알아본 도형을 잘못 미지원 처리함",
            "지원 계약 적용 오류",
            "실험 응답은 “원뿔대 또는 사다리꼴 형태의 회전체”라고 식별한 뒤 “계약에 없다”고 거부했습니다. 실험 지시에는 revolution / trapezoid가 명시되어 있으므로 응답의 지원 범위 판단은 잘못됐습니다.",
            "실험 프롬프트는 기존의 박스 전용 지시 뒤에 확장 범위 우선 지시를 덧붙인 형태였습니다. 두 범위가 함께 존재하는 설계 결함은 확인됩니다. 다만 그것이 이번 거부를 일으킨 단독 원인인지는 아직 입증하지 않았습니다.",
            "상충 없는 단일 지원 목록으로 바꾸고 같은 입력을 다시 비교해야 합니다. 이번 결과만으로 Flash-Lite가 원뿔대를 인식하지 못한다고 결론 내릴 수 없습니다.",
            None,
        ),
        (
            "B02",
            "평가 대상은 원기둥인데, 입력에는 대상 지정이 없음",
            "입력·평가 설계의 한계",
            "정답은행에서는 여러 보기 중 “마” 원기둥을 지정해 두었습니다. 그러나 이번 CV는 후보를 찾지 못해 여러 입체가 있는 문제 전체가 들어갔고, 실험 입력에는 “마를 그려라”라는 사용자 선택이 없었습니다.",
            "실험 지시는 여러 그림이면 첫 그림을 택하라고 했지만 평가 목표는 “마”였습니다. 따라서 이 건은 원하는 원기둥 복원에 실패한 운영 결과이지만, 공정하게 분리된 원기둥 인식 능력 시험은 아닙니다. 여러 그림이라는 이유만으로 문제 전체를 미지원 처리한 점도 남습니다.",
            "먼저 사용자 선택 또는 자동 후보별 대상 지정 규칙을 맞춰야 합니다. 이전 “확장 복원 0/2”는 관측 결과로 유지하되 모델의 곡면 인식률 0%로 해석하지 않습니다.",
            None,
        ),
    ]
    inputs = {
        x["id"]: x
        for x in json.loads((FLOW / "inputs.json").read_text(encoding="utf-8"))
    }
    blocks = []
    for cid, title, tag, obs, mechanism, limit, render in cases:
        pictures = figure(ROOT / f"1. fewshot/{cid}/problem.jpg", f"{cid} 원본 문제")
        if cid == "H01":
            pictures += figure(
                Path(inputs[cid]["current_files"][0]), "현재 경로에 실제 전달된 CV 조각"
            )
        if render:
            pictures += figure(
                FLOW / "runtime" / render, "실제 모델 응답의 3D · 교사 장면 아님"
            )
        blocks.append(
            f'<section><p class="tag">{cid} · {tag}</p><h2>{title}</h2><div class="pictures">{pictures}</div><h3>관측된 증거</h3><p>{obs}</p><h3>어디서 실패했나</h3><p>{mechanism}</p><div class="note">{limit}</div><p class="small"><a href="{url(FLOW / f"runs/{cid}/current.json")}">현재 경로 원문</a> · <a href="{url(FLOW / f"runs/{cid}/proposed.json")}">실험 경로 원문</a></p></section>'
        )
    page = """<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foldy · 10건 실험 오류 원인 분석</title><style>
    *{box-sizing:border-box}body{background:#eef2f7;color:#182b40;font:23px/1.8 system-ui,"Malgun Gothic",sans-serif;margin:0}main{max-width:1250px;margin:auto;padding:28px}header,section{background:#fff;border-radius:20px;padding:32px;margin:24px 0}h1{font-size:44px;line-height:1.35}h2{font-size:32px;line-height:1.45}h3{font-size:25px}a{color:#1755a2}p,td{overflow-wrap:anywhere}.tag,.small{font-size:17px;color:#52677c}.note{padding:20px;background:#fff5df;border-left:6px solid #d5901c;border-radius:8px}.lead{background:#e6f3ff;padding:22px;border-radius:12px}.pictures{display:flex;flex-wrap:wrap;gap:14px}figure{flex:1;min-width:230px;margin:0;background:#f4f6f9;padding:12px;border-radius:10px}img{width:100%;height:310px;object-fit:contain;background:white}figcaption{font-size:16px}.flow{display:flex;gap:10px;flex-wrap:wrap}.flow div{padding:16px;background:#edf3fb;flex:1;min-width:160px;border-radius:12px}.flow b{display:block}table{width:100%;border-collapse:collapse;font-size:20px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #d4dce5;padding:14px}.table{overflow:auto}code{font-size:19px}nav{position:sticky;top:0;background:#f7faffee;padding:12px;z-index:3}button{font:inherit;padding:4px 14px;margin-right:10px} @media(max-width:700px){main{padding:12px}header,section{padding:20px}h1{font-size:33px}h2{font-size:28px}body{font-size:21px}figure{min-width:100%}img{height:270px}}
    </style><nav><button onclick="document.body.style.fontSize=(parseFloat(getComputedStyle(document.body).fontSize)+2)+'px'">글자 +</button><a href="results.html">10건 실험 전체 결과</a></nav><main><header><p class="tag">FOLDY · 10문제 × 현재/실험 경로 · 기존 실측 원문 분석</p><h1>오류는 “퓨샷이 부족해서”<br>하나로 설명되지 않습니다.</h1><p class="lead">입력 잘림, 대상 선택 누락, 지원 범위 혼동, 전개도 좌표 생성 오류, JSON 형식 오류가 서로 다른 위치에서 발생했습니다. <strong>추가 학습 자료를 늘리기 전에 입력·지원 규칙·기하 검증을 먼저 정리해야 합니다.</strong></p><p>이번 문서는 새 API 실험 없이, 이미 실행한 10건의 사진·입력·응답·코드·실제 렌더를 대조한 분석입니다. 직접 확인된 실패 기전과 아직 원인을 분리 검증하지 못한 가설을 구분합니다.</p></header>
    <section><h2>실험은 어떻게 했나?</h2><div class="flow"><div><b>문제 10개 고정</b>공통지원 5 / 확장 2 / 보류 3</div><div><b>현재 경로</b>CV 후보 모두 → Flash + 별도 OCR</div><div><b>실험 경로</b>CV 최대 후보 + 문제 문맥 + 다른 예시 2개 → Lite</div><div><b>정답 검수</b>원문 대조 + 실제 반환 3D 생성·폐합</div></div><p>공통지원 복원은 양쪽 <strong>2/5</strong>, 전개도만 보면 현재 <strong>1/3</strong>, 실험 <strong>0/3</strong>입니다. 응답 중앙값은 6.14초 → 2.90초였지만, 잘못 거부해 빨리 끝난 사례도 포함되므로 성공한 복원만의 속도 향상과 같지 않습니다.</p><p>실제 백엔드는 TestClient로 호출했습니다. 사용자 조작, 브라우저 업로드, 실제 HTTP 통신과 전체 앱 첫 프레임 시간은 제외했습니다. 각 조건 1회이고 여러 설정을 동시에 바꿔 모델·퓨샷 각각의 효과를 분리하지 못했습니다.</p></section>
    <section><h2>오류가 발생한 위치</h2><div class="table"><table><tr><th>단계</th><th>확인한 문제</th><th>대표 사례</th></tr><tr><td>대상·영역 선택</td><td>그림 일부만 자름 / 여러 보기 중 목표 미지정</td><td>H01 / B02</td></tr><tr><td>지원 여부 판단</td><td>종이에 관한 질문을 미지원 도형으로 혼동 / 계약 지원 종류를 잘못 거부</td><td>H03 / E06</td></tr><tr><td>장면 생성</td><td>size와 faces 단위 불일치 / 면 부착 위치 오류</td><td>H01·A04 실험, H03 현재</td></tr><tr><td>형식 검사</td><td>올바른 형상·치수도 null 배열 때문에 탈락</td><td>C01 현재</td></tr><tr><td>표시 전 검증</td><td>JSON 유효성을 실제 닫히는 전개도와 혼동</td><td>잘못된 장면도 화면에는 나타남</td></tr></table></div></section>
    BLOCKS
    <section><h2>왜 잘못된 전개도가 검증을 통과했나?</h2><p>현재 ShapeScene 계약은 grid의 faces를 최소 1개부터 허용합니다. 스키마 통과는 필드와 값의 형식이 맞다는 뜻이며, 여섯 면이 직육면체로 닫힌다는 보증이 아닙니다. 실제로 H01-current는 면 1개, H01-proposed와 A04-proposed는 닫히지 않는 배치였지만 JSON 계약을 통과했습니다.</p><p>이것을 스키마 결함이라고만 볼 수는 없습니다. 기존 제품은 “잘못된 전개도를 찾는 문제”도 원문 그대로 보여주도록 설계됐습니다. <strong>원문 자체가 잘못된 전개도인지, 모델이 바른 원문을 잘못 옮겼는지 구분하는 검증</strong>이 필요합니다. 닫히지 않는 도형을 무조건 고쳐서 닫힌 상자로 만들면 학습 문제를 바꿔 버립니다.</p><p class="small">코드 근거: backend/app/ai/schema.py의 GridNet.faces(min_length=1), backend/app/ai/vision.py의 recognize/analyze_image/to_scene, backend/app/ai/vision_prompt.py의 잘못된 전개도 보존 규칙.</p></section>
    <section><h2>다음 수정과 검증의 우선순위</h2><div class="table"><table><tr><th>순서</th><th>수정 제안</th><th>최소 검증</th></tr><tr><td>1</td><td>대상 선택 규칙과 단일 지원 목록 확정. 기존 박스전용 제한에 확장을 덧붙이지 않고 명확한 목록 사용.</td><td>B02에 목표 보기를 명시한 입력 비교. E06·H03은 입력을 고정하고 범위 지시만 변경.</td></tr><tr><td>2</td><td>CV 후보가 불완전해도 문제 문맥을 함께 전달. 복수 후보를 한 그림으로 합칠지 여러 그림으로 볼지 결정.</td><td>H01의 현재 후보 / 전체 문맥 추가 조건을 같은 모델·프롬프트로 비교.</td></tr><tr><td>3</td><td>전개도 size–면 치수·변 연결·겹침·폐합 검사. 실패 시 불확실 표시 또는 필요한 부분만 재요청.</td><td>H01·A04·H03의 원문과 실제 반환 장면 대조. 올바른 원문을 자동 변형하지 않는지 확인.</td></tr><tr><td>4</td><td>C01 같은 형식 오류를 인식 실패와 구분. 허용되는 null 정규화 정책 또는 제한적 형식 재요청.</td><td>저장된 C01 응답으로 로컬 검증 가능. 모델 재호출 없이도 형식 원인은 재현 가능.</td></tr><tr><td>5</td><td>위 오류를 실제로 줄이는 사례만 퓨샷에 추가.</td><td>같은 모델·같은 입력·같은 지원 규칙에서 예시 유무만 비교. 실패 결과도 유지.</td></tr></table></div><p class="note">위 항목은 다음 실험 제안입니다. 이번 분석에서 제품 코드·프롬프트를 수정하거나 API 재실험을 실행하지 않았습니다. “수정하면 해결된다”는 검증 결과로 읽으면 안 됩니다.</p></section>
    <section><h2>앞선 결과를 읽을 때 보정할 점</h2><ul><li><strong>확장 0/2:</strong> 원하던 도형이 나오지 않은 관측값입니다. B02는 대상 지정이 불일치하고 E06은 지원 범위를 잘못 적용했으므로 곡면 인식 능력 0%라는 결론은 부당합니다.</li><li><strong>보류 3/3:</strong> 이번 렌더 범위에서 장면을 만들지 않은 결정이 적절했다는 뜻입니다. B03처럼 거부 설명은 부정확할 수 있어 “도형을 완전히 이해했다”는 뜻은 아닙니다.</li><li><strong>정답은행의 34/35:</strong> 동일 이미지와 정답 JSON을 제공했던 재현 결과입니다. 이번 자동 입력·다른 예시 실험의 정확도와 직접 비교하면 안 됩니다.</li></ul><p><a href="results.html">10건 실험 상세 보고서</a> · <a href="../semantic-review.json">원문 대조 판정</a> · <a href="../runtime.json">실제 장면 검증</a> · <a href="../api-calls.json">모델 원문 응답</a> · <a href="../experimental-prompt.txt">실험 프롬프트 전문</a> · <a href="../plan.json">동결한 실험 계획</a></p></section></main></html>"""
    OUT.write_text(page.replace("BLOCKS", "".join(blocks)), encoding="utf-8")
    print(str(OUT))


if __name__ == "__main__":
    main()
