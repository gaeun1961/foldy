"""10개 문제의 실제 API 경로와 문맥·2shot Lite 실험 경로 비교."""

import concurrent.futures
import contextvars
import hashlib
import json
import os
import sys
import threading
import time
from datetime import UTC, datetime
from pathlib import Path

from dotenv import dotenv_values
from fastapi.testclient import TestClient
from google import genai
from google.genai import models, types

REPO = Path("D:/_개발/3. Foldy(도형 학습 도우미)")
sys.path.insert(0, str(REPO / "backend"))
from app.ai import vision
from app.ai.schema import ShapeScene
from app.ai.vision_prompt import VISION_PROMPT
from app.main import app

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷")
OUT = ROOT / "8. flow10"
IDS = ["H03", "H01", "A04", "C01", "A01", "B02", "E06", "E08", "E03", "B03"]
EXAMPLES = ["E02", "D02"]
CTX = contextvars.ContextVar("run_key", default="unknown")
LOGS = []
LOCK = threading.Lock()
ORIGINAL = models.Models.generate_content


def read(p):
    return json.loads(Path(p).read_text(encoding="utf-8-sig"))


def save(p, data):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def mime(p):
    return "image/png" if Path(p).read_bytes().startswith(b"\x89PNG") else "image/jpeg"


def traced(self, *args, **kwargs):
    start = time.perf_counter()
    row = {"run": CTX.get(), "model": kwargs.get("model")}
    try:
        response = ORIGINAL(self, *args, **kwargs)
        row.update(
            response=response.text,
            usage=response.usage_metadata.model_dump(mode="json")
            if response.usage_metadata
            else None,
            resolved_model=getattr(response, "model_version", None),
        )
        return response
    except Exception as error:
        row.update(error_type=type(error).__name__, code=getattr(error, "code", None))
        raise
    finally:
        row["seconds"] = time.perf_counter() - start
        with LOCK:
            LOGS.append(row)
            save(OUT / "api-calls.json", LOGS)


SYSTEM = (
    VISION_PROMPT
    + """
이번 실험의 범위·출력 규칙이 위의 제한보다 우선한다.
응답은 {decision:scene|unsupported|uncertain, reason:string, dimension_source:printed|normalized|unknown, assumptions:string[], scene:ShapeScene|null}.
사진 전체의 인쇄된 문제 문맥과 자동 후보 크롭을 함께 보고 판단한다. 후보는 부분 도형이나 글자일 수 있으므로 문제 전체로 보완하라. 도형을 임의로 합치지 않는다.
그림이 여러 개면 전개도 문제에서는 첫 전개도, 그 밖에는 첫 인쇄 도형을 택한다. 선택지 목표를 정할 수 없으면 uncertain. 제공된 예시는 다른 문제이며 답이나 치수를 복사하지 않는다.
크기가 없으면 정규화 크기로 그릴 수 있지만 normalized와 가정을 반드시 적는다. 인쇄된 치수는 보존한다. 접힌 종이·평면 정사각형 연결 문제는 이번 렌더 계약 미지원이므로 unsupported. 일반 비정다각형 밑면은 정다각형으로 바꾸지 말고 uncertain.
cube/cuboid 외에도 cylinder(size:{radius,height},vertexLabels:[],net:{layout:default}), cone(size:{radius,height},vertexLabels:[null],net:{layout:default}), sphere(size:{radius},vertexLabels:[],net:{layout:default})를 허용한다. 모든 scene에 lines:[]를 포함한다.
회전 문제는 revolution, size:{figure:rectangle|right-triangle|semicircle|trapezoid,radius,height,top?,gap},vertexLabels:[],lines:[],net:{layout:default}. gap은 회전축과 도형 사이 거리이며 빈 원기둥은 rectangle과 양수gap. 근거가 없으면 이 종류를 추측하지 않는다.
JSON만 답한다.
"""
)


def main():
    OUT.mkdir(exist_ok=True)
    plan = {
        "created_at": datetime.now(UTC).isoformat(),
        "case_ids": IDS,
        "example_ids": EXAMPLES,
        "arms": [
            "current_api_with_explicit_manual_full_read_if_no_cv",
            "experimental_cv_largest_or_full_context_two_shot_lite",
        ],
        "repetitions_per_case_per_arm": 1,
        "case_concurrency": 1,
        "current_multiple_candidates": "all candidates concurrently, maximum 6",
        "cache": "fresh process; cleared before current case",
        "input": "user already selected/cropped one problem; no PDF ingestion or new photo capture",
        "timing": "CV previous measured timing separate; backend TestClient wall time + separate returned-scene rendering, not browser upload-to-ready",
        "no_test_answer_in_prompt": True,
        "evaluation": "schema, source semantics, target selection, dimensions, labels, safe refusal, render; unknown dimensions allow honest normalization",
        "causal_limit": "model, prompt, context and selection policy change together; not isolated few-shot improvement",
        "generalization": "known development worksheets, no new photographic conditions",
        "files_sha256": {
            str(p.relative_to(REPO)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in [
                REPO / "backend/app/ai/vision.py",
                REPO / "backend/app/ai/vision_prompt.py",
                REPO / "backend/app/api/routes.py",
                REPO / "frontend/src/ui/suggestBoxes.ts",
            ]
        },
    }
    if not (OUT / "plan.json").exists():
        save(OUT / "plan.json", plan)
    (OUT / "experimental-prompt.txt").write_text(SYSTEM, encoding="utf-8")
    inputs = read(OUT / "inputs.json")
    if isinstance(inputs, dict):
        inputs = inputs.get("cases", inputs.get("inputs"))
    im = {x["id"]: x for x in inputs}
    os.environ["LLM_API_KEY"] = dotenv_values(REPO / "backend/.env")["LLM_API_KEY"]
    os.environ.update(VISION_ENGINE="api", VISION_CLI="0", VISION_RECORD="0")
    models.Models.generate_content = traced
    example_parts = []
    for eid in EXAMPLES:
        lab = read(ROOT / f"2. teaching data/{eid}/bank50.reviewed.json")
        teacher = {
            "decision": "scene",
            "dimension_source": lab.get(
                "dimension_source", lab.get("dimension_policy")
            ),
            "assumptions": lab.get("assumptions", []),
            "scene": lab["scene_candidate"],
        }
        example_parts.extend(
            [
                types.Part.from_text(text="다른 문제의 검수 예시"),
                types.Part.from_bytes(
                    data=(ROOT / f"1. fewshot/{eid}/shape.jpg").read_bytes(),
                    mime_type="image/jpeg",
                ),
                types.Part.from_text(text=json.dumps(teacher, ensure_ascii=False)),
            ]
        )
    with TestClient(app) as http:
        for cid in IDS:
            row = im[cid]
            folder = OUT / "runs" / cid
            folder.mkdir(parents=True, exist_ok=True)
            if not (folder / "current.json").exists():
                vision._remembered.clear()

                def one(file, cid=cid, row=row):
                    CTX.set(f"{cid}/current")
                    files = {"file": ("shape", Path(file).read_bytes(), mime(file))}
                    if row.get("current_problem"):
                        files["problem"] = (
                            "problem",
                            Path(row["current_problem"]).read_bytes(),
                            mime(row["current_problem"]),
                        )
                    start = time.perf_counter()
                    resp = http.post("/analyze", files=files)
                    return {
                        "status": resp.status_code,
                        "body": resp.json(),
                        "seconds": time.perf_counter() - start,
                        "input": file,
                    }

                start = time.perf_counter()
                with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
                    outputs = list(pool.map(one, row["current_files"][:6]))
                save(
                    folder / "current.json",
                    {
                        "id": cid,
                        "arm": "current",
                        "manual_full_read": row["manual_full_read"],
                        "seconds": time.perf_counter() - start,
                        "outputs": outputs,
                    },
                )
                print(cid, "current", [x["status"] for x in outputs], flush=True)
            if not (folder / "proposed.json").exists():
                CTX.set(f"{cid}/proposed")
                start = time.perf_counter()
                result = {
                    "id": cid,
                    "arm": "proposed",
                    "model": "gemini-3.5-flash-lite",
                    "examples": EXAMPLES,
                    "input": row["proposed_file"],
                }
                client = genai.Client(
                    api_key=os.environ["LLM_API_KEY"],
                    http_options=types.HttpOptions(timeout=60000),
                )
                try:
                    parts = example_parts + [
                        types.Part.from_text(text="대상 문제 전체 문맥"),
                        types.Part.from_bytes(
                            data=Path(row["problem"]).read_bytes(),
                            mime_type=mime(row["problem"]),
                        ),
                        types.Part.from_text(
                            text="자동 선택 후보 또는 전체 문제 fallback"
                        ),
                        types.Part.from_bytes(
                            data=Path(row["proposed_file"]).read_bytes(),
                            mime_type=mime(row["proposed_file"]),
                        ),
                    ]
                    resp = client.models.generate_content(
                        model="gemini-3.5-flash-lite",
                        contents=parts,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM,
                            response_mime_type="application/json",
                            temperature=0,
                        ),
                    )
                    result["output"] = json.loads(resp.text or "{}")
                    if result["output"].get("scene"):
                        try:
                            ShapeScene.model_validate(result["output"]["scene"])
                            result["schema_valid"] = True
                        except ValueError:
                            result["schema_valid"] = False
                    result["status"] = "response"
                except Exception as error:  # noqa: BLE001 — 오류 사례도 측정 결과로 보존.
                    result.update(
                        status="error",
                        error_type=type(error).__name__,
                        code=getattr(error, "code", None),
                    )
                finally:
                    client.close()
                result["seconds"] = time.perf_counter() - start
                save(folder / "proposed.json", result)
                print(
                    cid,
                    "proposed",
                    result.get("output", {}).get("decision"),
                    round(result["seconds"], 2),
                    flush=True,
                )
    save(
        OUT / "finished.json",
        {"finished_at": datetime.now(UTC).isoformat(), "calls": len(LOGS)},
    )


if __name__ == "__main__":
    main()
