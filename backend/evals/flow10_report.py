"""flow10 기록을 읽어 큰 글씨 HTML 비교 보고서를 생성한다."""

import html
import json
import os
import statistics
from pathlib import Path
from urllib.parse import quote

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/8. flow10")
OUT = ROOT / "reports"


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


def pic(path, label):
    return f'<figure><a href="{url(path)}" target="_blank"><img loading="lazy" src="{url(path)}" alt="{esc(label)}"></a><figcaption>{esc(label)} · 클릭해서 확대</figcaption></figure>'


def net_svg(scene):
    faces = scene.get("net", {}).get("faces", [])
    if not faces:
        return ""
    try:
        xmin = min(f["x"] for f in faces)
        ymin = min(f["y"] for f in faces)
        xmax = max(f["x"] + f["w"] for f in faces)
        ymax = max(f["y"] + f["h"] for f in faces)
        span = max(xmax - xmin, ymax - ymin, 1)
        pad = span * 0.08
        parts = [
            f'<svg class="net" viewBox="{xmin - pad} {ymin - pad} {xmax - xmin + pad * 2} {ymax - ymin + pad * 2}" aria-label="반환 면 좌표 도식">'
        ]
        for i, f in enumerate(faces):
            text = f.get("text") or str(i + 1)
            parts.append(
                f'<rect x="{f["x"]}" y="{f["y"]}" width="{f["w"]}" height="{f["h"]}" fill="#b6d6ee" fill-opacity=".65" stroke="#223e56" stroke-width="{span * 0.006}"/><text x="{f["x"] + f["w"] / 2}" y="{f["y"] + f["h"] / 2}" font-size="{span * 0.045}" text-anchor="middle" dominant-baseline="middle">{esc(text)}</text>'
            )
        return (
            "".join(parts)
            + '</svg><p class="small">반환 좌표의 2D 도식. 숫자는 설명용 면 번호이며 실제 3D 화면이 아닙니다.</p>'
        )
    except (KeyError, TypeError, ValueError):
        return "<p>좌표 도식 생성 불가 — 원본 JSON 참조</p>"


def verdict(row):
    if not row:
        return '<p class="pending">원본 대조 심사 대기</p>'
    labels = [
        ("any_basic_correct_scene", "기하 정답 장면"),
        ("any_strict_correct_scene", "의미·라벨까지 정답"),
        ("correct_abstention", "적절한 보류"),
        ("scope_compliant", "인식 범위 준수"),
    ]
    parts = ['<div class="badges">']
    for key, name in labels:
        value = row.get(key)
        if value is not None:
            parts.append(
                f'<span class="badge">{name}: {"예" if value else "아니오"}</span>'
            )
    parts.append("</div>")
    reasons = row.get("reasons", [])
    if isinstance(reasons, str):
        reasons = [reasons]
    else:
        reasons = list(reasons)
    reasons += [
        f"후보 {c.get('index', 0) + 1}: {c['reason']}"
        for c in row.get("candidates", [])
        if c.get("reason")
    ]
    parts += [f"<p>{esc(r)}</p>" for r in reasons]
    parts.append(
        f'<p class="small">추가 잘못된 장면: {row.get("extra_false_scene_count", "미집계")}</p>'
    )
    return "".join(parts)


def arm_html(arm, data, semantic):
    title = "현재 제품 API" if arm == "current" else "제안 실험 어댑터"
    text = f'<section class="arm"><h3>{title}</h3>'
    if not data:
        return text + '<p class="pending">실측 대기</p></section>'
    text += f'<p class="timing">{data.get("seconds", 0):.2f}초</p>' + verdict(semantic)
    outputs = (
        data.get("outputs", [])
        if arm == "current"
        else [{"status": data.get("status"), "body": data.get("output", {})}]
    )
    for i, out in enumerate(outputs):
        body = out.get("body", {})
        scene = (
            body
            if arm == "current" and isinstance(body, dict) and body.get("shape")
            else body.get("scene")
            if isinstance(body, dict)
            else None
        )
        text += f'<div class="response"><h4>반환 {i + 1} · 상태 {esc(out.get("status"))}</h4>'
        if scene:
            text += (
                f"<p><b>{esc(scene.get('shape'))}</b> · 크기 {esc(scene.get('size'))}</p>"
                + net_svg(scene)
            )
        else:
            reason = (
                body.get("reason", body.get("detail", "장면 없음"))
                if isinstance(body, dict)
                else body
            )
            text += f"<p>{esc(reason)}</p>"
        text += "</div>"
    return (
        text
        + "<details><summary>원본 반환 JSON</summary><pre>"
        + pretty(data)
        + "</pre></details></section>"
    )


def summary_table(semantic):
    summary = semantic.get("summary", {})
    if not summary:
        return '<p class="pending">심사 결과 대기</p>'
    out = "<table><tr><th>판정</th><th>현재 제품 API</th><th>제안 실험</th></tr>"
    for group, title, metric in [
        ("common_boxes", "공통5건: 원본에 맞는 3D 장면", "strict_correct_scene_cases"),
        ("extension", "확장2건: 원기둥·원뿔대 생성", "strict_correct_scene_cases"),
        ("extension", "확장2건: 범위에 맞는 보류", "correct_abstention_cases"),
        ("mandatory_abstention", "보류3건: 적절한 보류", "correct_abstention_cases"),
    ]:
        out += "<tr><td>" + title + "</td>"
        for arm in ["current", "proposed"]:
            val = summary.get(arm, {}).get(group, {})
            out += f"<td><b>{val.get(metric, '—')} / {val.get('cases', '—')}</b></td>"
        out += "</tr>"
    return (
        out
        + '</table><p class="small">확장2건에서 현재 보류는 제품의 박스 전용 범위와 일치합니다. 제안은 확장 지원을 목표로 했으므로 같은 보류를 성공으로 세지 않습니다. 총합 단일 점수로 비교하지 않습니다.</p>'
    )


def runtime_gallery(runtime, ident):
    records = [
        r
        for r in runtime.get("records", [])
        if r.get("case_id") == ident and r.get("has_scene")
    ]
    if not records:
        return ""
    text = '<h3>실제 반환 장면을 기존 3D 엔진에서 표시</h3><div class="two">'
    for r in records:
        title = "현재" if r["arm"] == "current" else "제안"
        text += f'<section class="arm"><h4>{title} · {esc(r["id"])}</h4><p>{esc(r.get("visual_review", "원본 의미 판정은 위 심사 결과 참조"))}</p>'
        geo = r.get("geometry", {})
        text += f'<p class="small">엔진 표시: {"가능" if r.get("runtime_verified") else "불가"} · 면 {geo.get("faceCount", "—")} / 꼭짓점 {geo.get("vertexCount", "—")} / 모서리 {geo.get("edgeCount", "—")} · 모든 모서리 2면 접합: {"예" if geo.get("allEdgesIncidentToTwoFaces") else "아니오"}</p>'
        for name, path in r.get("screenshots", {}).items():
            text += pic(
                path, title + (" 접은 상태" if name == "solid" else " 펼친 상태")
            )
        text += "</section>"
    return text + "</div>"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plan = read(ROOT / "plan.json", {})
    inputs = read(ROOT / "inputs.json", [])
    reference = read(ROOT / "reference.json", {})
    semantic = read(ROOT / "semantic-review.json", {})
    runtime = read(ROOT / "runtime.json", {})
    calls = read(ROOT / "api-calls.json", [])
    rows = {(r["id"], r["arm"]): r for r in semantic.get("rows", [])}
    refs = {r["id"]: r for r in reference.get("cases", [])}
    runs = {
        (x["id"], arm): read(ROOT / "runs" / x["id"] / (arm + ".json"))
        for x in inputs
        for arm in ["current", "proposed"]
    }
    times = {
        arm: [
            d["seconds"]
            for (ident, a), d in runs.items()
            if a == arm and d and isinstance(d.get("seconds"), (int, float))
        ]
        for arm in ["current", "proposed"]
    }
    median = lambda arm: (
        f"{statistics.median(times[arm]):.2f}초" if times[arm] else "대기"
    )
    head = """<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foldy 실제 흐름 10문제 비교</title><style>
:root{--font:23px;--bg:#f1f4f8;--card:#fff;--ink:#182b40;--muted:#536475;--line:#cbd5e1}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:var(--font)/1.65 system-ui,'Malgun Gothic',sans-serif}body.dark{--bg:#111a25;--card:#1e2b3b;--ink:#edf3fb;--muted:#bdc9d7;--line:#536475}main{max-width:1450px;margin:auto;padding:30px}h1{font-size:2.1em;line-height:1.25}h2{font-size:1.45em}h3{font-size:1.2em}h4{font-size:1em}.card,article{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;margin:22px 0}.toolbar{position:sticky;top:0;z-index:10;background:var(--card);padding:10px 22px;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,a{color:inherit}button{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 16px;font:inherit;cursor:pointer}.toolbar a{font-size:.8em}.small,figcaption{font-size:.78em;color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.metric{padding:18px;border:1px solid var(--line);border-radius:12px}.metric b{display:block;font-size:1.5em}.two{display:grid;grid-template-columns:1fr 1fr;gap:22px}.arm{min-width:0;padding:20px;border:1px solid var(--line);border-radius:12px}.response{border-top:1px solid var(--line);padding:12px 0}figure{margin:10px 0}img{width:100%;max-height:600px;object-fit:contain;background:#fff;border-radius:8px}.crops{display:flex;gap:14px;flex-wrap:wrap}.crops figure{flex:1;min-width:180px;max-width:480px}.crops img{max-height:300px}.net{display:block;width:100%;height:280px;background:#fff;border-radius:8px}.timing{font-size:1.5em;font-weight:bold}.pending{color:#a56400}.badges{display:flex;gap:6px;flex-wrap:wrap}.badge{font-size:.7em;padding:4px 8px;border-radius:6px;border:1px solid var(--line)}pre{white-space:pre-wrap;word-break:break-word;font:15px/1.6 ui-monospace,monospace;max-height:620px;overflow:auto;padding:15px;background:var(--bg)}details{margin:15px 0}summary{cursor:pointer}table{border-collapse:collapse;width:100%;font-size:.85em}th,td{border-bottom:1px solid var(--line);padding:12px;text-align:left;vertical-align:top}.notice{border-left:6px solid #b87b15;padding:15px;background:var(--bg)}@media(max-width:850px){main{padding:14px}.card,article{padding:17px}.two{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}h1{font-size:1.7em}}
</style></head><body><nav class="toolbar"><button onclick="font(2)">글자 +</button><button onclick="font(-2)">글자 −</button><button onclick="document.body.classList.toggle('dark')">밝기 전환</button><a href="#method">방법</a><a href="#scores">판정</a><a href="#gallery">문제별 비교</a></nav><main><h1>실제 인식 흐름<br>10문제 비교</h1><p>현재 백엔드 라우트와 가벼운 모델을 쓰는 제안 흐름을 같은 문제로 비교합니다.</p>"""
    parts = [
        head,
        f'<div class="notice">호출 기록: 현재 {len(times["current"])}/10 · 제안 {len(times["proposed"])}/10 · 원본 대조 심사 {len(rows)}/20행. 완료되지 않은 단계는 성공으로 집계하지 않습니다.</div>',
    ]
    if semantic:
        parts.append(
            '<section class="card"><h2>응답 시간은 줄었고, 공통 문제의 정답 수는 같았습니다</h2><p>현재와 제안 모두 공통5문제 중2문제를 원본에 맞게 복원했습니다. 현재는 A04·A01, 제안은 C01·A01이 맞았습니다. 확장 목표인 원기둥·원뿔대는 이번 제안 흐름에서 생성하지 못했습니다.</p><p>따라서 이 실험은 제품 인식기를 바로 교체할 근거가 아닙니다. 빠른 분류·검수된 정답 은행 활용과 전개도 기하 검증을 분리하는 방향을 지지합니다.</p></section>'
        )
    parts.append(
        f'<section class="card"><div class="metrics"><div class="metric">현재 중앙값<b>{median("current")}</b></div><div class="metric">제안 중앙값<b>{median("proposed")}</b></div><div class="metric">전체 읽기 모사<b>6건</b></div><div class="metric">현재 후보 요청<b>12건</b></div></div><p class="small">최대 응답시간: 현재 {max(times["current"], default=0):.2f}초 · 제안 {max(times["proposed"], default=0):.2f}초. 서버 TestClient/모델 호출 경과시간. 브라우저 업로드·실제 HTTP 네트워크·프론트 조작·화면 준비시간은 제외합니다. CV는 이전 실측을 재사용하며 새 측정처럼 합산하지 않습니다.</p></section>'
    )
    parts.append(
        """<section id="method" class="card"><h2>비교한 두 흐름</h2><div class="two"><div><h3>현재 제품 API</h3><p>문제 선택 → 현재 CV → 모든 후보를 실제 /analyze 라우트로 전달</p><p>도형: Gemini 3.5 Flash. 문제 OCR: Flash-Lite. 후보가 없는 6건은 사용자가 ‘사진 전체 읽기’를 눌렀다고 가정했습니다. 후보가 둘인 2건은 모두 호출해 총12요청입니다. 첫 요청에만 문제 OCR을 전달하는 현재 경로를 따릅니다.</p></div><div><h3>제안 실험 어댑터</h3><p>같은 CV → 가장 큰 후보 최대1개 → 문제 문맥 + 고정2예시 → 3.5 Flash-Lite</p><p>후보가 없으면 전체 문제를 읽습니다. E02·D02 예시만 고정 사용했고 이번10문제의 정답은 넣지 않았습니다. 직접 API 호출하는 실험 어댑터이며 제품에 통합하지 않았습니다.</p></div></div><div class="notice">모델·프롬프트·문맥·후보 선택이 함께 바뀌므로 퓨샷만의 효과라고 주장할 수 없습니다. 개발자료10개 각1회 결과이며 새 촬영 조건의 일반화 검증이 아닙니다.</div><p>제안 프롬프트에는 기존 박스 전용 지시 뒤에 확장 범위를 우선하는 지시를 추가했습니다. 상충하는 범위 문장이 함께 있어 곡면 보류를 모델 능력 부족으로 단정할 수 없습니다. 이번 결과를 본 뒤 프롬프트를 고쳐 재시험하지 않았습니다.</p></section>"""
    )
    parts.append(
        '<section id="scores" class="card"><h2>범위를 나누어 판정합니다</h2><table><tr><th>범위</th><th>사례</th><th>해석</th></tr><tr><td>공통5건</td><td>H03,H01,A04,C01,A01</td><td>정육면체·직육면체의 원본 기하·치수·라벨</td></tr><tr><td>확장2건</td><td>B02,E06</td><td>원기둥·원뿔대. 현재 제품의 범위상 보류와 잘못된 장면을 구분</td></tr><tr><td>보류3건</td><td>E08,E03,B03</td><td>접힌 종이·평면 문제·지원하지 않는 밑면 구조</td></tr></table>'
    )
    parts.append(
        summary_table(semantic)
        + "<details><summary>심사 집계 원본</summary><pre>"
        + pretty(semantic.get("summary", {}))
        + "</pre></details>"
        if semantic
        else '<p class="pending">심사 결과 대기. 정답률 미집계.</p>'
    )
    parts.append(
        '<p>기하 정답과 의미 라벨까지 보존한 엄격 정답을 구분합니다. 정답 후보와 잘못된 추가 장면이 함께 반환되는 경우도 별도로 표시합니다.</p></section><section class="card"><h2>반환 장면의 실제 뷰어 검증</h2>'
    )
    parts.append(
        "<p>현재 반환 장면4개 중3개, 제안 반환 장면4개 중4개가 엔진에 표시됐습니다. 그러나 표시된 장면에도 열린 면·겹침이 있어 정답 성공률이 아닙니다. 전체 앱 화면이 아닌 기존 buildStage를 사용했습니다.</p><details><summary>런타임 검증 원본 기록</summary><pre>"
        + pretty(runtime)
        + "</pre></details>"
        if runtime
        else '<p class="pending">뷰어 검증 대기. 스키마 통과를 화면 표시 성공으로 보지 않습니다.</p>'
    )
    parts.append('</section><h2 id="gallery">원본 · 자동 후보 · 반환값</h2>')
    for item in inputs:
        ident = item["id"]
        ref = refs.get(ident, {})
        parts.append(
            f'<article id="case-{ident}"><h2>{ident} · {esc(ref.get("kind", ""))} / {esc(ref.get("shape", ""))}</h2><p>{esc(ref.get("acceptance", ""))}</p>'
            + pic(item["problem"], "문제 전체 — 보조 문맥")
        )
        parts.append(
            f'<p>CV 후보 <b>{len(item.get("cv_boxes", []))}개</b> · 이전 실측 중앙값 {item.get("cv_median_ms", 0):.2f}ms · {"후보없음: 전체 읽기 버튼 모사" if item.get("manual_full_read") else "자동 후보 사용"}</p><div class="crops">'
        )
        for i, path in enumerate(item.get("current_files", [])):
            parts.append(
                pic(
                    path,
                    f"현재 입력{i + 1}"
                    + (
                        " · 제안에서도 선택"
                        if path == item.get("proposed_file")
                        else " · 제안에서는 제외"
                    ),
                )
            )
        parts.append(
            '</div><div class="two">'
            + arm_html("current", runs[ident, "current"], rows.get((ident, "current")))
            + arm_html(
                "proposed",
                runs[ident, "proposed"],
                rows.get((ident, "proposed")) or rows.get((ident, "experimental")),
            )
            + "</div>"
            + runtime_gallery(runtime, ident)
            + "</article>"
        )
    usage = {}
    for call in calls:
        model = call.get("resolved_model") or call.get("model", "unknown")
        u = call.get("usage") or {}
        t = usage.setdefault(
            model,
            {"calls": 0, "prompt_tokens": 0, "output_tokens": 0, "total_tokens": 0},
        )
        t["calls"] += 1
        for key, src in [
            ("prompt_tokens", "prompt_token_count"),
            ("output_tokens", "candidates_token_count"),
            ("total_tokens", "total_token_count"),
        ]:
            t[key] += u.get(src) or 0
    parts.append(
        '<section class="card"><h2>호출 기록과 재현 근거</h2><p>총 API28회: 현재 도형12회 + OCR6회, 제안10회. 저장된 호출의 토큰을 합산했습니다. 최신 단가 확인 전이므로 금액은 추정하지 않습니다.</p><pre>'
        + pretty(usage)
        + "</pre><p>"
    )
    for name in [
        "plan.json",
        "inputs.json",
        "reference.json",
        "api-calls.json",
        "experimental-prompt.txt",
    ]:
        parts.append(f'<a href="{url(ROOT / name)}">{name}</a> · ')
    parts.append(
        "</p><details><summary>측정 계획 원문</summary><pre>"
        + pretty(plan)
        + '</pre></details></section></main><script>let size=23;function font(d){size=Math.max(18,Math.min(36,size+d));document.documentElement.style.setProperty("--font",size+"px")}</script></body></html>'
    )
    (OUT / "results.html").write_text("".join(parts), encoding="utf8")
    print(
        json.dumps(
            {
                "current": len(times["current"]),
                "proposed": len(times["proposed"]),
                "semantic_rows": len(rows),
                "runtime": bool(runtime),
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
