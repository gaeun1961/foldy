"""외부에 보관된 bank50 실측 근거로 큰 글씨 HTML 보고서를 만든다."""

import html
import json
import os
import statistics
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷")
BANK = ROOT / "7. bank50"
REPORT = BANK / "reports/results.html"


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def esc(value):
    return html.escape(str(value))


def link(path):
    return quote(os.path.relpath(path, REPORT.parent).replace("\\", "/"), safe="/.:")


def main():
    cases = read(BANK / "verified/existing-cases.json")
    labels = read(BANK / "verified/labels.json")
    for batch in "abc":
        cases += read(BANK / f"batches/{batch}/cases.json")
        labels += read(BANK / f"batches/{batch}/labels.json")
    reference = [c for c in cases if c["id"] in ["D04", "E05"]]
    cases = [c for c in cases if c not in reference]
    for case in cases:
        for name in ["problem", "shape"]:
            local_image = ROOT / "1. fewshot" / case["id"] / f"{name}.jpg"
            if local_image.exists():
                case[name] = str(local_image)
    lm = {x["id"]: x for x in labels}
    results = {
        p.parent.name: read(p) for p in (BANK / "runs/seen-one").glob("*/result.json")
    }
    approved = [
        c
        for c in cases
        if lm[c["id"]].get("approved_for_prompt") and lm[c["id"]].get("scene_candidate")
    ]
    times = sorted(r["seconds"] for r in results.values())
    tokens = {
        k: sum((r.get("usage") or {}).get(k) or 0 for r in results.values())
        for k in [
            "prompt_token_count",
            "candidates_token_count",
            "thoughts_token_count",
            "total_token_count",
        ]
    }
    stats = {
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "start_utc": "2026-11-01T04:29:33+00:00",
        "new_work_cutoff_utc": "2026-11-01T04:49:33+00:00",
        "main_cases": len(cases),
        "reference_examples": len(reference),
        "item_types": dict(Counter(c.get("item_type", "problem") for c in cases)),
        "teacher_scenes": len(approved),
        "held_cases": len(cases) - len(approved),
        "api_calls": len(results),
        "schema_valid": sum(r.get("schema_valid", False) for r in results.values()),
        "strict_scene_match": sum(
            r.get("teacher_scene_exact_match", False) for r in results.values()
        ),
        "median_api_seconds": statistics.median(times),
        "min_api_seconds": min(times),
        "max_api_seconds": max(times),
        "p95_api_seconds_nearest_rank": times[int(len(times) * 0.95)],
        "token_usage": tokens,
        "generalization_claim": False,
        "automatic_image_matching": False,
        "weight_training_performed": False,
        "teacher_scene_shapes": dict(
            Counter(lm[c["id"]]["scene_candidate"]["shape"] for c in approved)
        ),
    }
    (BANK / "summary.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    cards = []
    for case in cases:
        cid = case["id"]
        label = lm[cid]
        result = results.get(cid)
        ok = bool(label.get("approved_for_prompt") and label.get("scene_candidate"))
        status = (
            "엄밀 일치"
            if result and result.get("teacher_scene_exact_match")
            else "문자 표기 손실"
            if result
            else "보류 · API 제외"
        )
        reason = (
            label.get("reason")
            or label.get("notes")
            or label.get("observation")
            or label.get("support_status")
            or "세부 라벨 참고"
        )
        dim = label.get("dimension_source") or label.get("dimension_policy") or "미정"
        source = case.get("page") or case.get("source")
        question = case.get("question") or case.get("problem_number") or ""
        figures = f'<figure><a href="{link(case["problem"])}"><img loading="lazy" src="{link(case["problem"])}" alt="{cid} 문제 크롭"></a><figcaption>문제 크롭 · 클릭하면 원본 크기</figcaption></figure>'
        render = next(
            (
                p
                for p in [
                    BANK / f"verified/c-rendering/{cid}-solid.png",
                    BANK / f"verified/batch-rendering-final/{cid}-solid.png",
                    BANK / f"verified/rendering/{cid}-solid.png",
                ]
                if p.exists()
            ),
            None,
        )
        if render:
            figures += f'<figure><a href="{link(render)}"><img loading="lazy" src="{link(render)}" alt="{cid} 교사 장면 렌더"></a><figcaption>교사 JSON의 3D 렌더</figcaption></figure>'
        else:
            figures += f'<figure><img loading="lazy" src="{link(case["shape"])}" alt="{cid} 지정 도형"><figcaption>지정 도형 · 정확한 장면 채택 보류</figcaption></figure>'
        extra = (
            f'<a href="{link(BANK / f"runs/seen-one/{cid}/result.json")}">API 원본 결과</a> · {result["seconds"]:.2f}초'
            if result
            else "이 항목은 이번 API 재현 실험에서 제외"
        )
        cards.append(
            f'<article class="case" data-status="{"approved" if ok else "hold"}" data-search="{esc(cid + str(source) + str(reason))}"><h3>{cid} <span class="badge {"ok" if ok else "hold"}">{status}</span></h3><p>{esc(case.get("title", case.get("kind", "")))} · {esc(source)} {esc(question)}</p><div class="pictures">{figures}</div><p>{esc(reason)}</p><p class="small">종류: {esc(label.get("kind"))} · 치수: {esc(dim)} · {esc(case.get("item_type", "problem"))}</p><p>{extra}</p></article>'
        )
    evidence = [
        ("전체 요약 JSON", BANK / "summary.json"),
        ("출처·중복 감사", BANK / "verified/dedup-audit.json"),
        ("H05 문자 손실 상세", BANK / "verified/H05-reproduction-review.json"),
        ("기존 15개 런타임 요약", BANK / "verified/summary.json"),
        ("신규 A/B 18개 런타임", BANK / "verified/batch-render.json"),
        ("신규 C 2개 런타임", BANK / "verified/c-render.json"),
        ("20분 작업 계획", BANK / "reports/plan.html"),
    ]
    evidence_html = "".join(
        f'<li><a href="{link(p)}">{name}</a></li>' for name, p in evidence
    )
    doc = """<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Foldy · 20분 병렬 실측 보고</title><style>
    :root{color-scheme:light;--ink:#172638;--blue:#175cd3;--muted:#536171}*{box-sizing:border-box}body{margin:0;background:#edf2f7;color:var(--ink);font:22px/1.7 system-ui,"Malgun Gothic",sans-serif}main{max-width:1280px;margin:auto;padding:36px 24px}header,section,.case{background:white;border-radius:20px;padding:30px;margin:24px 0;box-shadow:0 3px 18px #182d4210}h1{font-size:46px;line-height:1.25}h2{font-size:32px}h3{font-size:26px}p{overflow-wrap:anywhere}a{color:#124fb3}strong{color:#103f76}.eyebrow,.small{font-size:17px;color:var(--muted)}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.kpis div{padding:20px;background:#eaf2ff;border-radius:16px}.kpis b{font-size:40px;display:block}.warn{border-left:7px solid #d98b13;background:#fff6df;padding:22px;border-radius:12px}.good{border-left:7px solid #188866;background:#eaf8f2;padding:22px}.flow{display:flex;align-items:stretch;gap:12px;flex-wrap:wrap}.flow div{background:#eff4fb;padding:18px;border-radius:12px;flex:1;min-width:170px}.flow b{display:block;color:#164f9c}.pictures{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:#f5f7fa;padding:12px;border-radius:12px}img{width:100%;height:310px;object-fit:contain;background:white}figcaption{font-size:16px;color:var(--muted)}.badge{display:inline-block;font-size:16px;padding:4px 12px;border-radius:20px}.ok{background:#d9f5e6}.hold{background:#ffedc8}.controls{position:sticky;top:0;z-index:2;background:#edf2f7f5;padding:16px;display:flex;gap:12px;flex-wrap:wrap}input,select{font:inherit;padding:10px;border:1px solid #9aaec6;border-radius:9px;max-width:100%}table{width:100%;border-collapse:collapse;font-size:20px}td,th{border-bottom:1px solid #dbe2eb;text-align:left;padding:14px;vertical-align:top}code{font-size:17px;overflow-wrap:anywhere}.table-scroll{overflow-x:auto}@media(max-width:720px){body{font-size:20px}main{padding:12px}header,section,.case{padding:20px}h1{font-size:34px}h2{font-size:28px}.kpis{grid-template-columns:1fr 1fr}.pictures{grid-template-columns:1fr}img{height:260px}.kpis b{font-size:34px}}@media print{.controls{display:none}.case{break-inside:avoid}body{font-size:14px}img{height:200px}}
    </style><main><header><p class="eyebrow">FOLDY · 2026.11.01 · 13:29:33 시작 / 13:49:33 새 작업 중단 기준</p><h1>50개 문제 자료를 정리했고,<br>35개 3D 장면을 실측했습니다.</h1><p>4개 Git 워크트리에서 자료 선정·교사 검수·3D 검증·API 실험을 병렬 수행했습니다. 목표 개수에 맞추기 위해 판단이 모호한 도형을 억지로 정답으로 만들지 않았습니다.</p><div class="kpis"><div><b>50</b>주은행 문제 출처</div><div><b>35</b>검증한 교사 3D</div><div><b>34 / 35</b>동일 예시 엄밀 재현</div><div><b>MEDIAN</b>API 응답 중앙값</div></div><p class="warn"><strong>이번 결과는 “알려진 문제를 같은 예시로 다시 제시한 재현 실험”입니다.</strong> 자동 이미지 검색이나 새로운 문제에 대한 인식 성능을 측정한 결과가 아닙니다. API가 받은 예시에는 바로 그 문제의 정답 JSON이 포함됩니다.</p></header>
    <section><h2>그래서 시연은 어떻게 하는 것이 좋은가?</h2><p><strong>검수된 문제를 선택하는 시연</strong>이라면 정답은행의 장면을 직접 불러오는 편이 API를 매번 부르는 것보다 비용과 지연을 줄입니다. 이번 실험은 작은 모델이 제공된 장면을 안정적으로 반환하는지 확인했습니다. 그 문제를 사진만 보고 은행에서 찾아내는 기능은 아직 연결하지 않았습니다.</p><div class="flow"><div><b>① 사용자가 문제 선택</b>시연 목록의 검수된 문제 ID</div><div><b>② 정답은행 조회</b>35개 교사 장면 중 해당 JSON</div><div><b>③ 계약 검사</b>지원 종류·필수 필드 확인</div><div><b>④ 현재 3D 뷰어</b>정규화 치수는 가정 표시</div></div><p>새로 촬영한 사진까지 받으려면 문제 매칭과 문맥 판단을 별도로 검증해야 합니다. 이번에는 프론트에 모델을 추가하지 않았고, 서비스 코드·자동 매칭·지원 범위를 변경하지 않았습니다.</p></section>
    <section><h2>무엇을 실제로 측정했나?</h2><div class="flow"><div><b>수동으로 문제·도형 크롭</b>출처와 문제 번호 기록</div><div><b>교사 JSON 검수</b>도형·치수·라벨·가정 정리</div><div><b>Gemini 1-shot</b>같은 도형 + 정답 1개를 예시로 제공</div><div><b>반환값 비교</b>JSON 계약 / 교사 장면 일치</div></div><p>모델: <code>gemini-3.5-flash-lite</code>. 항목당 1회 호출, 호출당 예시 1개, API 동시 요청 2~3개. 은행 50개를 한 요청에 모두 넣지 않았습니다. B 묶음 교사 검수와 최종 출처 감사에는 요청하신 Astra low를 사용했습니다.</p><div class="table-scroll"><table><tr><th>검증 항목</th><th>결과</th><th>해석</th></tr><tr><td>교사 장면 구조·런타임</td><td>35 / 35</td><td>현재 코드에서 장면 생성 및 렌더. 전체 앱·모바일 성능·글자 표시 완전성 검증은 아님.</td></tr><tr><td>모델 응답 계약 검사</td><td>35 / 35</td><td>응답 JSON이 ShapeScene 계약을 만족.</td></tr><tr><td>교사 장면 엄밀 일치</td><td>34 / 35</td><td>무의미한 순서·기본값 차이를 정규화한 뒤 비교.</td></tr><tr><td>치수 가정 분류 유지</td><td>35 / 35</td><td>필드 수준 검사. H05는 구체적인 가정 설명 문장이 누락됨.</td></tr><tr><td>응답 시간</td><td>TIMING</td><td>네트워크 포함 API 왕복. 촬영·CV·화면 표시까지의 전체 시간은 아님.</td></tr><tr><td>토큰 사용량</td><td>TOKENS</td><td>API usage 합산. 청구 금액이 아니며 실제 결제 내역은 확인하지 않음.</td></tr></table></div><p>35회 모두 같은 입력에 대한 1회 관측입니다. 반복 안정성·모델 간 우열·few-shot 이전 대비 향상은 이 실험만으로 주장할 수 없습니다. 이전 별도 비교에서 새 전개도 복원 개선을 입증하지 못한 결과도 그대로 유효합니다.</p></section>
    <section><h2>H05: 도형은 같지만 원문자가 바뀜</h2><p><strong>㉮ ㉯ ㉰ ㉱ ㉲ ㉳ → 가 나 다 라 마 바</strong></p><p>면 좌표·크기·색칠·꼭짓점 라벨은 교사 장면과 동일했습니다. 그러나 인쇄된 문자 스타일이 바뀌어 엄밀 일치 실패로 기록했습니다. 정규화 여부 필드는 유지됐지만 “3×2×4는 실제 치수가 아닌 가정”이라는 설명도 빠졌습니다. 은행의 원본 장면을 직접 표시하거나 후단에서 가정 안내를 확실히 보장해야 합니다.</p></section>
    <section><h2>50개 모두 3D로 채택하지 않은 이유</h2><p><strong>35개 채택 / 15개 보류.</strong> 크기를 몰라도 종류와 연결 구조가 확인되면 정규화한 예시 크기로 그릴 수 있습니다. 그 수치는 원본의 실측값이나 정확한 비율이 아닙니다.</p><ul><li>접힌 종이 D03·E08: 접힌 위치·겹침·접는 축을 설명하는 별도 장면 모델이 필요합니다. 이번에는 정확한 애니메이션을 만들지 않았습니다.</li><li>평면 도형 E03: 직각삼각형에 정사각형을 붙인 그림입니다. 전개도처럼 보인다는 이유로 입체를 만들지 않습니다.</li><li>색칠·주사위 A02·A08·A09·A13: 기본 입체는 가능하지만 문제 핵심인 면 색과 숫자를 현재 후보가 충분히 보존하지 않아 보류했습니다.</li><li>일반 각기둥 B03·B04·B07·B08 등: 밑면 형상이 불명확한데 정다각형으로 바꾸면 다른 도형이 됩니다. 정규화는 구조를 임의로 바꾸는 허가가 아닙니다.</li></ul><p>보류는 “영원히 지원 불가” 판정이 아닙니다. 이번 시간 안에 원문에 충실한 장면을 검증하지 못했다는 뜻입니다. 이 15개를 Gemini가 정확히 거부하는지에 대한 별도 부정 사례 실측도 아직 하지 않았습니다.</p></section>
    <section><h2>자료 구성과 근거</h2><p>주은행은 <strong>문제 레코드 46개 + 문제의 선택부분 4개</strong>입니다. 설명용 예시 D04·E05는 별도 참고 2개로 분리했습니다. D01·E01은 질문 일부가 잘렸고, E08은 기존 제목의 20번과 달리 실제 인쇄 번호가 18번입니다. 완전한 문제 이미지 50장이라는 뜻은 아닙니다.</p><p>동일 이미지 파일 해시 중복은 없고 신규 A/B/C의 주문제 키 28개를 대조했습니다. 다른 교재에 도해가 재수록됐는지까지 완전히 보증하지는 않습니다. 모든 항목은 시연·개발 자료이며 별도 미공개 테스트셋으로 계산하지 않습니다.</p><ul><li><code>1. fewshot/ID/</code> — 문제·도형 이미지</li><li><code>2. teaching data/ID/bank50.*.json</code> — 교사 라벨·출처·가정</li><li><code>7. bank50/runs/seen-one/ID/</code> — 제공한 교사 예시·모델 원문·실측 결과</li><li><code>7. bank50/verified/</code> — 3D 스크린샷·출처 감사</li></ul><p>여기서 “증류 자료”는 교사 답변을 정리한 데이터입니다. 가벼운 모델의 가중치를 학습하거나 CV에 few-shot 데이터를 학습시킨 것은 아닙니다. 교사 검수는 에이전트 검수이며 사용자 최종 승인과 구분됩니다.</p><ul>EVIDENCE</ul></section>
    <section><h2>병렬 작업 범위</h2><div class="table-scroll"><table><tr><th>워크트리</th><th>작업</th></tr><tr><td>bank50-data-a</td><td>A13 + 보완 C2 선정·크롭·교사 후보 / 최종 자료 복사</td></tr><tr><td>bank50-data-b</td><td>B13 선정·Astra low 검수 / 출처·중복 감사</td></tr><tr><td>bank50-verify</td><td>기존15 + 신규20 장면 계약·기하·실제 렌더 검증</td></tr><tr><td>bank50-integration</td><td>API 35회 / 비교 / 큰 글씨 HTML 보고</td></tr></table></div><p>위 경로는 <code>D:/_개발/foldy-bench-tools/worktrees/</code> 아래에 있습니다. 제품 변경을 합치거나 커밋·PR을 만들지 않았습니다. 20분 경계 이후에는 신규 실험을 시작하지 않는 기준으로 진행했습니다.</p></section>
    CV_SECTION
    <section><h2>전체 50개를 직접 확인하세요</h2><p>사진 옆 3D는 <strong>교사 JSON</strong>의 렌더입니다. 모델 응답 렌더와 구분합니다. 승인된 후보만 API로 시험했으므로 이 목록으로 전체 자동 분류 정확도를 계산할 수 없습니다.</p></section><div class="controls"><input id="q" placeholder="ID·출처·내용 검색" aria-label="사례 검색"><select id="filter" aria-label="상태 필터"><option value="all">전체 50개</option><option value="approved">3D 채택 35개</option><option value="hold">보류 15개</option></select><span id="count">50개</span></div>CARDS<p class="small">생성: GENERATED · 상세 수치와 원문은 연결된 JSON에 보존했습니다.</p></main><script>const q=document.querySelector('#q'),f=document.querySelector('#filter');function update(){let n=0;for(const c of document.querySelectorAll('.case')){let show=(f.value==='all'||c.dataset.status===f.value)&&c.textContent.toLowerCase().includes(q.value.toLowerCase());c.hidden=!show;if(show)n++}document.querySelector('#count').textContent=n+'개'}q.addEventListener('input',update);f.addEventListener('change',update);</script></html>"""
    cv = BANK / "verified/cv-bank50.json"
    cv_html = "<section><h2>CV 자동 탐지는 별도 과제</h2><p>이번 모델 실측은 사람이 지정한 도형 크롭으로 진행했습니다. 현재 CV가 이 50개에서 같은 영역을 자동으로 찾아낼지는 이 결과에 포함되지 않습니다. 이전 12개 실측의 탐지 실패도 이번 정답 예시 재현으로 해결됐다고 볼 수 없습니다.</p></section>"
    if cv.exists():
        cv_stats = read(cv)["summary"]
        stats["cv_baseline"] = cv_stats
        (BANK / "summary.json").write_text(
            json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        cv_html = f'''<section><h2>핵심 병목: 현재 CV는 50개 중 40개에서 후보가 없었습니다</h2><p class="warn"><strong>정답 예시 복제는 잘 되지만, 자동으로 그 도형을 찾는 단계는 아직 약합니다.</strong> 따라서 “현재 CV + few-shot이면 전체 플로우가 개선됐다”는 결론을 내릴 수 없습니다.</p><div class="table-scroll"><table><tr><th>현재 CV · 변경 없음</th><th>실측</th></tr><tr><td>후보 없음</td><td>{cv_stats["zero_candidates"]} / 50</td></tr><tr><td>지정 도형 영역의 90% 이상을 덮는 후보</td><td>{cv_stats["any_candidate_coverage_ge_0_9"]} / 50 · E02 / H03 / H04</td></tr><tr><td>영역 겹침 IoU ≥ 0.5인 후보</td><td>{cv_stats["any_candidate_iou_ge_0_5"]} / 50 · H03</td></tr><tr><td>복수 후보 / 회전 감지 차단</td><td>2개 / 1개</td></tr><tr><td>처리 시간 중앙값</td><td>{cv_stats["median_of_per_case_median_ms"]:.2f}ms · 480px / 데스크톱</td></tr></table></div><p>문제당 8회 처리 시간의 중앙값을 구한 뒤 50문제 중앙값을 집계했습니다. 이미지 읽기·리사이즈·네트워크는 제외했습니다. 기준 영역은 사람이 지정한 여백 포함 크롭이므로 픽셀 단위 정답 마스크는 아닙니다. 후보가 없어 전체 문제를 반환한 fallback은 탐지 성공으로 세지 않았습니다.</p><p>이 자료·설정에서의 결과이며 일반적인 CV 정확도가 아닙니다. 이번에는 알고리즘을 변경하지 않았습니다. <a href="{link(cv)}">원본 결과와 측정 범위</a></p></section>'''
    replacements = {
        "MEDIAN": f"{stats['median_api_seconds']:.2f}초",
        "TIMING": f"중앙값 {statistics.median(times):.2f}초<br>최소 {min(times):.2f} / 최대 {max(times):.2f}초",
        "TOKENS": f"입력 {tokens['prompt_token_count']:,}<br>출력 {tokens['candidates_token_count']:,}",
        "EVIDENCE": evidence_html,
        "CARDS": "".join(cards),
        "GENERATED": stats["generated_at_utc"],
        "CV_SECTION": cv_html,
    }
    for key, value in replacements.items():
        doc = doc.replace(key, value)
    REPORT.write_text(doc, encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=True))


if __name__ == "__main__":
    main()
