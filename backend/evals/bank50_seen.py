"""기지 학습지 1-shot 재현 실험. 예시 선택은 ID로 명시하며 자동 매칭을 주장하지 않는다."""

import argparse
import concurrent.futures
import datetime
import hashlib
import json
import sys
import time
from pathlib import Path

from dotenv import dotenv_values
from google import genai
from google.genai import types

REPO = Path("D:/_개발/3. Foldy(도형 학습 도우미)")
sys.path.insert(0, str(REPO / "backend"))
from app.ai.schema import ShapeScene

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50")
DEADLINE = datetime.datetime.fromisoformat("2026-11-01T04:49:33+00:00")
SYSTEM = """너는 사전에 준비한 학습지의 도형을 읽는다. 아래 예시 그림과 교사 JSON을 참고해 마지막 대상 그림을 분석한다. 문제 글은 보조 문맥이며 마지막 도형 확대가 판단 대상이다. 주변 다른 도형을 합성체로 묶지 않는다. 인쇄된 것만 보존하고 학생 풀이/채점은 치수나 라벨로 넣지 않는다.
응답 JSON: {kind,decision,dimension_source,assumptions,scene}. decision은 scene/unsupported/uncertain. scene은 예시와 같은 Foldy ShapeScene 계약. 없는 꼭짓점은 null, net과 lines를 포함하고 problem은 넣지 않는다. 그림과 동일한 면 연결/면의 글자/꼭짓점 라벨/색칠을 보존한다. 잘못되거나 미완성인 전개도를 임의 완성하지 않는다.
실제 치수가 없으면 예시에서 정규화한 크기를 사용해도 되며 dimension_source=normalized와 가정을 명시한다. 원뿔대는 원뿔로 바꾸지 않는다. 일반 비정삼각형 밑면을 정삼각형으로 바꾸지 않는다. 교사 예시와 다른 대상이면 무조건 정답을 복사하지 않는다. 설명문 없이 JSON만 반환."""


def canonical(scene):
    if scene is None:
        return None
    r = ShapeScene.model_validate(scene).model_dump(mode="json", exclude_none=True)
    r.pop("problem", None)
    r.pop("photoBox", None)
    n = r.get("net", {})
    if n.get("layout") == "grid":
        for f in n["faces"]:
            if not f.get("fill"):
                f.pop("fill", None)
            if not f.get("text"):
                f.pop("text", None)
        n["faces"] = sorted(n["faces"], key=lambda f: (f["x"], f["y"], f["w"], f["h"]))
        n["cornerLabels"] = sorted(
            n.get("cornerLabels", []), key=lambda f: (f["x"], f["y"], f["text"])
        )
        n["lines"] = sorted(
            n.get("lines", []), key=lambda f: json.dumps(f, sort_keys=True)
        )
    return r


def loadlist(p):
    o = json.loads(p.read_text(encoding="utf-8-sig"))
    return o if isinstance(o, list) else o.get("cases", o.get("labels", []))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", choices=["existing", "a", "b", "c"], required=True)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()
    d = ROOT / "verified" if args.batch == "existing" else ROOT / "batches" / args.batch
    cases = loadlist(
        d / ("existing-cases.json" if args.batch == "existing" else "cases.json")
    )
    labels = {r["id"]: r for r in loadlist(d / "labels.json")}
    out = ROOT / "runs/seen-one"
    out.mkdir(parents=True, exist_ok=True)
    (out / "system.txt").write_text(SYSTEM, encoding="utf8")
    tasks = []
    for c in cases:
        l = labels.get(c["id"], {})
        if not l.get("approved_for_prompt") or not l.get("scene_candidate"):
            continue
        # 형식 검증 실패 교사장면은 모델에 넣지 않는다.
        canonical(l["scene_candidate"])
        tasks.append((c, l))
    key = dotenv_values(REPO / "backend/.env").get("LLM_API_KEY")
    if not key:
        raise RuntimeError("No API key")

    def run(pair):
        c, l = pair
        folder = out / c["id"]
        if (folder / "result.json").exists():
            return
        if datetime.datetime.now(datetime.UTC) >= DEADLINE:
            return
        folder.mkdir(exist_ok=True)
        ds = l.get("dimension_source", "")
        ds = "normalized" if "normal" in ds or "assumption" in ds else "printed"
        teacher = {
            "kind": l.get("kind", c.get("kind")),
            "decision": "scene",
            "dimension_source": ds,
            "assumptions": l.get("assumptions", []),
            "scene": l["scene_candidate"],
        }
        (folder / "teacher.json").write_text(
            json.dumps(teacher, ensure_ascii=False, indent=2), encoding="utf8"
        )
        record = {
            "id": c["id"],
            "mode": "seen_example_reproduction",
            "example_selection": "explicit_case_id_not_automatic_matching",
            "example_count": 1,
            "requested_model": "gemini-3.5-flash-lite",
            "started_at": datetime.datetime.now(datetime.UTC).isoformat(),
            "source_batch": args.batch,
            "teacher_sha256": hashlib.sha256(
                json.dumps(teacher, ensure_ascii=False, sort_keys=True).encode()
            ).hexdigest(),
            "input_sha256": {
                k: hashlib.sha256(Path(c[k]).read_bytes()).hexdigest()
                for k in ["problem", "shape"]
            },
            "image_in_example_is_same_as_query": True,
        }
        client = genai.Client(
            api_key=key, http_options=types.HttpOptions(timeout=45000)
        )
        start = time.perf_counter()
        try:
            parts = [
                types.Part.from_text(text="검수 예시 그림:"),
                types.Part.from_bytes(
                    data=Path(c["shape"]).read_bytes(), mime_type="image/jpeg"
                ),
                types.Part.from_text(
                    text="교사 예시 정답: " + json.dumps(teacher, ensure_ascii=False)
                ),
                types.Part.from_text(text="이제 대상 문제 문맥:"),
                types.Part.from_bytes(
                    data=Path(c["problem"]).read_bytes(), mime_type="image/jpeg"
                ),
                types.Part.from_text(text="분석할 대상 도형 확대:"),
                types.Part.from_bytes(
                    data=Path(c["shape"]).read_bytes(), mime_type="image/jpeg"
                ),
            ]
            resp = client.models.generate_content(
                model=record["requested_model"],
                contents=parts,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM,
                    response_mime_type="application/json",
                    temperature=0,
                ),
            )
            (folder / "response.txt").write_text(resp.text or "", encoding="utf8")
            record["output"] = json.loads(resp.text or "{}")
            record["status"] = "response"
            record["usage"] = (
                resp.usage_metadata.model_dump(mode="json")
                if resp.usage_metadata
                else None
            )
            record["resolved_model"] = getattr(resp, "model_version", None)
            try:
                scene = record["output"].get("scene")
                record["schema_valid"] = (
                    scene is not None and canonical(scene) is not None
                )
                record["teacher_scene_exact_match"] = scene is not None and canonical(
                    scene
                ) == canonical(teacher["scene"])
            except (ValueError, TypeError, KeyError):
                record["schema_valid"] = False
                record["teacher_scene_exact_match"] = False
            record["kind_match"] = record["output"].get("kind") == teacher["kind"]
            record["sizing_disclosed"] = ds != "normalized" or (
                record["output"].get("dimension_source") == "normalized"
                and bool(record["output"].get("assumptions"))
            )
        except Exception as e:  # noqa: BLE001 — 실패 유형만 기록하고 다른 사례를 계속 실측한다.
            record["status"] = "error"
            record["error_type"] = type(e).__name__
            record["error_code"] = getattr(e, "code", None)
        finally:
            client.close()
        record["seconds"] = round(time.perf_counter() - start, 3)
        (folder / "result.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2), encoding="utf8"
        )
        print(
            c["id"],
            record["status"],
            record.get("teacher_scene_exact_match"),
            record["seconds"],
            flush=True,
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        list(pool.map(run, tasks))
    print("eligible", len(tasks), flush=True)


if __name__ == "__main__":
    main()
