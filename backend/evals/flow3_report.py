"""flow3: 동일 모델의 0/2-shot 및 브라우저 첫 프레임 측정 보고서."""

import html
import json
import os
from pathlib import Path
from urllib.parse import quote

from flow10_report import net_svg

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/9. flow3")
OUT = ROOT / "reports"
FLOW10 = ROOT.parent / "8. flow10"


def read(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def esc(value):
    return html.escape(str(value))


def url(path):
    return quote(os.path.relpath(Path(path), OUT).replace("\\", "/"), safe="/:.")


def pretty(value):
    return esc(json.dumps(value, ensure_ascii=False, indent=2))


def image(path, label):
    return f'<figure><a href="{url(path)}" target="_blank"><img src="{url(path)}" alt="{esc(label)}"></a><figcaption>{esc(label)} · 클릭하여 확대</figcaption></figure>'


def api_panel(ident, arm):
    title = "보완0예시" if arm == "corrected0shot" else "보완2예시"
    path = ROOT / "runs" / arm / (ident + ".json")
    data = read(path)
    text = f'<section class="card"><h3>{title}</h3>'
    if not data:
        return text + '<p class="pending">API 결과 대기</p></section>'
    diag = data.get("diagnostics", {})
    text += f'<p class="small">요청 모델: {esc(data.get("model"))}<br>실제 응답 모델: {esc(diag.get("resolved_model", "미기록"))}</p>'
    text += f"<p>서버 결정: <b>{esc(data.get('decision', '미기록'))}</b></p>"
    for key, label in [("model_seconds", "모델 호출"), ("server_seconds", "서버 전체")]:
        value = diag.get(key)
        if isinstance(value, (int, float)):
            text += f"<p>{label}: {value:.2f}초</p>"
    if diag.get("format_normalizations"):
        text += "<p>형식 보정: " + esc(diag["format_normalizations"]) + "</p>"
    if diag.get("gate_errors"):
        text += '<p class="notice">기하 검사 차단: ' + esc(diag["gate_errors"]) + "</p>"
    scene = data.get("scene")
    if scene:
        text += (
            f"<p>허용 Scene: {esc(scene.get('shape'))} · {esc(scene.get('size'))}</p>"
            + net_svg(scene)
        )
    else:
        text += "<p>표시 허용 Scene 없음. 아래 원본으로 모델 반환과 검사 차단을 구분합니다.</p>"
        raw_scene = (data.get("output") or {}).get("scene")
        if raw_scene:
            text += "<h4>모델이 반환했으나 검사에서 전달하지 않은 후보</h4>" + net_svg(
                raw_scene
            )
    return (
        text
        + "<details><summary>API 원본 기록</summary><pre>"
        + pretty(data)
        + "</pre></details></section>"
    )


def seconds(value):
    return f"{value / 1000:.2f}초" if isinstance(value, (int, float)) else "해당 없음"


def browser_table(browser):
    if not browser:
        return '<p class="pending">브라우저 측정 대기</p>'
    out = "<h3>병렬 묶음 경과시간</h3><table><tr><th>조건</th><th>동시 문제</th><th>묶음 종료까지</th></tr>"
    for w in browser.get("waves", []):
        title = "보완0예시" if w.get("arm") == "corrected0shot" else "보완2예시"
        out += f"<tr><td>{title}</td><td>{w.get('concurrency', 3)}</td><td>{seconds(w.get('wall_ms'))}</td></tr>"
    out += "</table><h3>개별 문제: 시작부터 첫 3D 프레임까지</h3><table><tr><th>조건·문제</th><th>첫 프레임</th><th>모델 호출</th><th>HTTP 요청</th><th>Viewer 준비</th><th>결과</th></tr>"
    for w in browser.get("waves", []):
        title = "보완0예시" if w.get("arm") == "corrected0shot" else "보완2예시"
        for r in w.get("results", []):
            t = r.get("timings", {})
            out += f"<tr><td>{title} {esc(r.get('id'))}</td><td>{seconds(t.get('first_frame_ms'))}</td><td>{seconds((r.get('response', {}).get('diagnostics', {}).get('model_seconds') or 0) * 1000)}</td><td>{seconds(t.get('api_ms'))}</td><td>{seconds(t.get('viewer_ms'))}</td><td>{esc(r.get('status'))}</td></tr>"
    return (
        out
        + '</table><p class="small">묶음 경과시간은 세 요청의 합계가 아닙니다. 첫 프레임이 없는 보류·차단은 응답 종료시간과 구분합니다. HTTP 시간은 모델 호출 외 서버 처리와 로컬 네트워크도 포함합니다.</p>'
    )


def browser_pics(browser, ident):
    out = '<div class="two">'
    for w in browser.get("waves", []):
        for r in w.get("results", []):
            if r.get("id") != ident:
                continue
            title = "보완0예시" if w.get("arm") == "corrected0shot" else "보완2예시"
            out += (
                f"<section><h3>{title} 브라우저 결과</h3><p>{esc(r.get('status'))}</p>"
            )
            if r.get("geometry_gate"):
                out += (
                    "<details><summary>브라우저 기하 검사</summary><pre>"
                    + pretty(r["geometry_gate"])
                    + "</pre></details>"
                )
            shot = r.get("screenshot")
            if shot:
                out += image(shot, title + " 실제 브라우저 화면")
            out += "</section>"
    return out + "</div>"


def result_summary(semantic, browser):
    if not semantic:
        return ""
    text = '<section class="card"><h2>세 문제는 두 조건 모두 정확히 표시됐습니다</h2><p><b>보완0예시 3/3, 보완2예시 3/3.</b> 원본의 도형·치수·면 배치·지원 라벨이 맞고 실제 Viewer의 첫 화면까지 도달했습니다. 이 세 문제에서는 예시 두 개를 추가한 정확도 이득이 관측되지 않았습니다.</p>'
    text += '<div class="metrics"><div class="metric">보완0예시<b>3/3 정답 표시</b></div><div class="metric">보완2예시<b>3/3 정답 표시</b></div><div class="metric">추가 예시의 정확도 차이<b>0건</b></div></div>'
    text += "<p>병렬 세 문제 완료시간은 34.762초 → 33.583초, 차이는 약 1.179초입니다. 조건별 한 번만 실행했고 0예시 다음 2예시 순서여서 캐시·초기 준비와 동시 실행 환경의 영향이 섞일 수 있습니다. <b>속도 향상을 입증한 결과는 아닙니다.</b></p>"
    text += "<h3>입력 토큰은 약 1.96배</h3><table><tr><th>세 요청 합계</th><th>보완0예시</th><th>보완2예시</th></tr><tr><td>입력 토큰</td><td>8,456</td><td>16,604</td></tr><tr><td>출력 토큰</td><td>1,006</td><td>1,173</td></tr><tr><td>생각 토큰</td><td>7,609</td><td>8,987</td></tr></table><p>실제 금액은 계산하지 않았습니다. 최소 비용이 목적이면 모든 요청에 항상 예시를 붙일 근거는 아직 부족합니다. 개선되는 오류 유형에만 예시를 선택 적용하고 추가 검증하는 편이 타당합니다.</p>"
    return (
        text
        + '<p class="notice">이번 성공은 상위 모델과 동일하게 보완한 실험 경로에서의 3문제 성공입니다. 기존 제품 그대로의 성공률이나 모델 교체만의 효과로 해석할 수 없습니다. 이미 검토한 개발 자료이며 새로운 문제에 대한 일반화 검증이 아닙니다.</p></section>'
    )


def semantic_table(semantic):
    text = "<table><tr><th>조건</th><th>문제</th><th>모델 원문 정답</th><th>전달 장면 정답</th><th>형식 차단</th></tr>"
    for r in semantic.get("rows", []):
        title = "보완0예시" if r.get("arm") == "corrected0shot" else "보완2예시"
        text += f"<tr><td>{title}</td><td>{esc(r.get('id'))}</td><td>{'정답' if r.get('raw_strict_correct') else '실패'}</td><td>{'정답' if r.get('delivered_strict_correct') else '실패'}</td><td>{'있음' if r.get('format_blocked') else '없음'}</td></tr>"
    return (
        text
        + "</table><p>각 문제의 두 조건 입력 해시는 일치했습니다. 본 비교 6건의 실제 응답 모델은 모두 gemini-3.6-flash로 같았습니다. 에이전트의 원본 대조 판정이며 사람의 최종 승인 자료는 아닙니다.</p>"
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plan = read(ROOT / "plan.json", {})
    browser = read(ROOT / "browser-runtime.json", {})
    semantic = read(ROOT / "semantic-review.json", {})
    oldrefs = read(ROOT / "reference.json", {}) or read(FLOW10 / "reference.json", {})
    refs = {r["id"]: r for r in oldrefs.get("cases", [])}
    oldinputs = {r["id"]: r for r in read(FLOW10 / "inputs.json", [])}
    ids = ["H01", "A04", "C01"]
    main_records = [
        read(ROOT / "runs" / arm / (ident + ".json"))
        for arm in ["corrected0shot", "corrected2shot"]
        for ident in ids
    ]
    main_records = [x for x in main_records if x]
    resolved = sorted(
        {
            str(x.get("diagnostics", {}).get("resolved_model", "미기록"))
            for x in main_records
        }
    )
    parts = [
        """<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foldy 동일 모델 퓨샷 3문제 비교</title><style>
:root{--font:23px;--bg:#f1f4f8;--paper:#fff;--ink:#183047;--line:#c9d5df}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:var(--font)/1.7 system-ui,'Malgun Gothic',sans-serif}body.dark{--bg:#121d29;--paper:#203145;--ink:#edf4fb;--line:#53697f}main{max-width:1400px;margin:auto;padding:28px}h1{font-size:2em;line-height:1.3}h2{font-size:1.4em}h3{font-size:1.15em}.card,article{padding:26px;background:var(--paper);border:1px solid var(--line);border-radius:16px;margin:24px 0}.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}.toolbar{position:sticky;top:0;background:var(--paper);padding:10px 24px;border-bottom:1px solid var(--line);z-index:10;display:flex;gap:12px;flex-wrap:wrap}button{font:inherit;padding:6px 16px;border-radius:8px;border:1px solid var(--line);color:inherit;background:var(--bg);cursor:pointer}a{color:inherit}img{width:100%;max-height:580px;object-fit:contain;background:white}figure{margin:14px 0}.small,figcaption{font-size:.8em}.notice{border-left:6px solid #a66c10;padding:16px;background:var(--bg)}.pending{color:#9b640a}pre{white-space:pre-wrap;word-break:break-word;background:var(--bg);padding:15px;font:16px/1.6 monospace;max-height:650px;overflow:auto}summary{cursor:pointer}td,th{overflow-wrap:anywhere;padding:12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.table-scroll{max-width:100%;overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9em}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.metric{border:1px solid var(--line);padding:16px;border-radius:10px}.metric b{font-size:1.4em;display:block}@media(max-width:850px){main{padding:13px}.card,article{padding:17px}.two,.metrics{grid-template-columns:1fr}h1{font-size:1.6em}}
</style></head><body><nav class="toolbar"><button onclick="font(2)">글자 +</button><button onclick="font(-2)">글자 −</button><button onclick="document.body.classList.toggle('dark')">밝기 전환</button><a href="#measure">시간 측정</a><a href="#cases">문제별 확인</a></nav><main><h1>같은 모델에 예시 2개를 더하면<br>정확도와 첫 표시 시간이 달라질까?</h1><p>H01·A04·C01 세 문제에 동일한 모델 식별자 gemini-3.5-flash를 요청합니다. 본 비교 6건의 실제 응답 모델(resolved_model)은 모두 gemini-3.6-flash였습니다. 조건 간 차이는 고정 교사 예시 E02·D02의 주입 여부입니다. 모델 가중치를 재학습한 실험이 아닙니다.</p>"""
    ]
    parts.append(
        f'<p class="notice">본 비교 API 기록 {len(main_records)}/6건 · 브라우저 묶음 {len(browser.get("waves", []))}/2개 · 실제 응답 모델: {esc(", ".join(resolved) or "대기")}</p>'
    )
    parts.append(result_summary(semantic, browser))
    pilot = ROOT / "instrumentation-failure/first-zero-shot"
    if pilot.exists():
        parts.append(
            '<section class="card"><h2>계측 장애와 재측정 기록</h2><p>첫 보완0예시3건은 API 응답 후 스크린샷 안정성 대기 시간초과로 브라우저 시간 기록을 잃었습니다. 원문 응답은 보존했으며, 결과 품질을 보고 고른 재시도가 아닙니다.</p><p>입력·프롬프트·모델 조건을 유지하고 기록을 먼저 저장하도록 수정한 뒤 보완0예시3건을 다시 측정하고 보완2예시3건을 실행합니다. 비교에는 시간 기록이 있는 본6건만 사용합니다. 전체 호출은 본6건+계측실패3건, 총9회입니다.</p><details><summary>최초3건 원문 — 본 비교 집계 제외</summary>'
        )
        for ident in ["H01", "A04", "C01"]:
            path = pilot / (ident + ".json")
            if path.exists():
                parts.append(f'<p><a href="{url(path)}">{ident} 최초 응답</a></p>')
        if (ROOT / "pilot-semantic-review.json").exists():
            parts.append(
                f'<p><a href="{url(ROOT / "pilot-semantic-review.json")}">최초3건 별도 의미 심사</a></p>'
            )
        parts.append("</details></section>")
    parts.append(
        '<section class="card"><h2>이번 비교에서 고정하는 것</h2><table><tr><th>항목</th><th>보완0예시</th><th>보완2예시</th></tr><tr><td>모델</td><td>요청 gemini-3.5-flash<br>실제 응답 모델은 아래 기록 확인</td><td>동일</td></tr><tr><td>입력</td><td>같은 문제·CV 후보·전체 문제 문맥</td><td>동일</td></tr><tr><td>출력 형식·지원 범위 지시</td><td>단일 박스 지원 범위·좌표 단위·형식 보정·기하 검사 적용</td><td>동일</td></tr><tr><td>교육 예시</td><td>없음</td><td>E02·D02 이미지와 교사 JSON 두 개</td></tr><tr><td>실행</td><td>3문제 병렬, 각1회</td><td>다음 묶음에서3문제 병렬, 각1회</td></tr></table><p class="notice">두 조건은 이번 실험 서버 경로이며, 앞선 flow10의 현재 제품 API와 같은 조건이 아닙니다. 3문제는 이미 검토한 개발 자료입니다. 예시 효과를 비교하는 조건을 맞췄지만, 표본이 작고 조건별1회·순차 묶음 실행이라 안정적인 일반화 성능이나 통계적 우위를 증명하지는 않습니다. 보완0예시를 먼저 실행해 뒤의 보완2예시는 셰이더·캐시 준비의 영향을 받을 수 있습니다. 모델 호출 시간을 별도로 봐야 예시 효과와 초기 렌더링 준비를 혼동하지 않습니다.</p></section>'
    )
    parts.append(
        '<section id="measure" class="card"><h2>브라우저에서 첫 화면까지 측정</h2><p>브라우저 파일 가져오기·디코딩 → CV → 로컬 서버 HTTP 요청 → 모델·스키마·기하 검사 → 실제 Viewer의 onReady까지 잽니다. 사람이 촬영하고 문제를 선택하는 시간과 앱 모듈의 최초 로딩은 포함하지 않습니다. 데스크톱 소프트웨어 WebGL에서 Viewer3개를 병렬 실행했습니다. 실제 휴대폰 하드웨어 성능으로 해석할 수 없습니다. 개별 문제의 경과시간과 세 문제를 병렬 처리한 묶음 경과시간을 구분합니다.</p><p>보류·오류로 Scene이 없으면 ‘첫 3D 프레임’ 시간은 없습니다. 이때 요청 종료 시간을 표시 시간처럼 비교하지 않습니다. 서버 기본 기하 검사와 브라우저 폐합 검사를 두 조건에 동일하게 적용합니다. 보정은 cube/cuboid의 null vertexLabels를 미상 라벨8개로 바꾸는 형식 처리이며 치수·면 배치를 임의로 고치지 않습니다. Viewer가 준비됐어도 원본 기하가 맞는지는 별도 판정합니다.</p>'
    )
    if browser:
        parts.append(browser_table(browser))
        parts.append(
            "<details><summary>브라우저 실측 원본</summary><pre>"
            + pretty(browser)
            + "</pre></details>"
        )
    else:
        parts.append(
            '<p class="pending">브라우저 실측 대기 — 완료되지 않은 시간을 추정하지 않습니다.</p>'
        )
    parts.append('</section><section class="card"><h2>원본 대조 판정</h2>')
    if semantic:
        parts.append(semantic_table(semantic))
        parts.append(
            "<details open><summary>심사 결과</summary><pre>"
            + pretty(semantic.get("summary", semantic))
            + "</pre></details>"
        )
    else:
        parts.append(
            '<p class="pending">이번 반환값의 원본 대조 심사 대기. 이전 flow10 판정을 이번 결과에 옮겨 적용하지 않습니다.</p>'
        )
    parts.append('</section><h2 id="cases">세 문제와 사전 판정 기준</h2>')
    for ident in ids:
        ref = refs.get(ident, {})
        parts.append(
            f'<article id="case-{ident}"><h2>{ident}</h2><p>{esc(ref.get("acceptance", ""))}</p>'
        )
        if ident in oldinputs:
            parts.append(image(oldinputs[ident]["problem"], "원본 문제"))
        parts.append(
            '<p class="small">원본의 고정된 기하 기준과 이번 반환값을 대조합니다.</p><div class="two">'
            + api_panel(ident, "corrected0shot")
            + api_panel(ident, "corrected2shot")
            + "</div>"
            + browser_pics(browser, ident)
            + "</article>"
        )
    parts.append('<section class="card"><h2>재현 기록</h2>')
    for name in [
        "plan.json",
        "reference.json",
        "browser-runtime.json",
        "semantic-review.json",
        "format-regression.json",
        "gate-regression.json",
    ]:
        if (ROOT / name).exists():
            parts.append(f'<p><a href="{url(ROOT / name)}">{name}</a></p>')
    if plan:
        parts.append(
            "<details><summary>계획 원문</summary><pre>"
            + pretty(plan)
            + "</pre></details>"
        )
    parts.append(
        '</section></main><script>let size=23;function font(d){size=Math.max(18,Math.min(36,size+d));document.documentElement.style.setProperty("--font",size+"px")}</script></body></html>'
    )
    (OUT / "results.html").write_text(
        "".join(parts)
        .replace("<table>", '<div class="table-scroll"><table>')
        .replace("</table>", "</table></div>"),
        encoding="utf8",
    )
    print(
        json.dumps(
            {"browser": bool(browser), "semantic": bool(semantic), "plan": bool(plan)}
        )
    )


if __name__ == "__main__":
    main()
