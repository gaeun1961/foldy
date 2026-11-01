"""동일 상위 모델의 0/2shot 진단용 서버. 제품 설정과 파일은 바꾸지 않는다."""

import hashlib
import json
import math
import sys
import time
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from dotenv import dotenv_values
from fastapi import FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from google import genai
from google.genai import types
from pydantic import ValidationError

REPO = Path("D:/_개발/3. Foldy(도형 학습 도우미)")
sys.path.insert(0, str(REPO / "backend"))
from app.ai.schema import ShapeScene

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷")
OUT = ROOT / "9. flow3"
IDS = ["H01", "A04", "C01"]
EXAMPLES = ["E02", "D02"]
MODEL = "gemini-3.5-flash"
KEY = dotenv_values(REPO / "backend/.env")["LLM_API_KEY"]
PROMPT = """수학 학습지의 인쇄된 대상 도형을 읽어 Foldy 3D 장면으로 옮긴다. 문제 전체 문맥과 자동 후보 확대를 함께 본다. 후보는 잘린 일부 또는 잘못 선택된 영역일 수 있으므로 전체 문제로 보완한다. 학생 필기·채점·답은 무시한다.
이 실험의 단일 지원 범위는 직육면체·정육면체의 입체 그림 및 전개도다. 질문이 종이 가로세로·넓이를 묻더라도 그 안의 지원 도형을 그릴 수 있으면 지원한다. 평면 정사각형 연결, 접힌 종이 자체, 일반 합성체는 지원하지 않는다. 대상이 모호하면 uncertain으로 답한다.
그림에 겨냥도와 전개도가 같이 있으면 전개도를 재현하고 겨냥도의 인쇄 치수를 사용한다. 여러 선택지면 첫 번째 전개도를 대상으로 한다. 주변 그림들을 합성하지 않는다.
응답 JSON: {decision:scene|unsupported|uncertain,reason:string,dimension_source:printed|normalized|unknown,assumptions:string[],scene:ShapeScene|null}.
ShapeScene: {shape:cuboid|cube,size:{width,depth,height}또는{edge},vertexLabels:[null,null,null,null,null,null,null,null],lines:[],net:{layout:cross}또는{layout:grid,faces:[{x,y,w,h,text?,fill?}],cornerLabels:[{x,y,text}],lines:[]}}.
입체 그림만 있으면 cross. 실제 전개도가 있으면 원문과 같은 grid. 모든 face 좌표와 폭·높이의 단위는 size와 같아야 한다. 인쇄치수가 있는데 face만 임의의1,2격자로 정규화하지 않는다. 면의 정확한 부착위치와 연결된 변 전체를 관찰하고 보존한다. 눈에 보이는 직사각형 면을 누락하거나 임의로 추가하지 않는다.
그림이 원래 잘못된 전개도를 찾는 문제라면 원문을 임의로 닫히게 고치지 않는다. 이 실험의3D복원에 확신이 없으면 uncertain으로 보류한다.
vertexLabels는 반드시8개 배열이다. 라벨이 안보이면 각 원소를null로 둔다. 길이를 뜻하는㉠㉡/빈칸/수치는 꼭짓점 라벨에 넣지 않는다. cornerLabels는 실제 꼭짓점에 붙은 문자만 보존한다. 면의 색은 균일 바탕이면생략하고 특정면만다른경우fill:true. 면 안 글자는text. 인쇄 모서리를lines에중복추가하지않는다.
치수가없으면 정규화한 예시크기로 그려도 되며 dimension_source=normalized와 assumptions에 실제치수가아님을 적는다. 다른 문제의 예시가 있더라도 그 치수·라벨·연결배치를 대상문제에 복사하지 않는다.
설명문 없이 JSON만 반환한다."""


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def grid_gate(scene):
    """지원 상자의 기본 치수·연결 검사. 공간 폐합은 브라우저에서 추가 검사."""
    if scene.get("net", {}).get("layout") != "grid":
        return []
    faces = scene["net"]["faces"]
    errors = []
    if len(faces) != 6:
        return ["box_grid_requires_six_faces_for_this_3d_demo"]
    size = scene["size"]
    w, d, h = (
        (size["edge"],) * 3
        if scene["shape"] == "cube"
        else (size["width"], size["depth"], size["height"])
    )
    pair = lambda a, b: tuple(sorted((round(a, 5), round(b, 5))))
    expected = Counter([pair(w, d)] * 2 + [pair(w, h)] * 2 + [pair(d, h)] * 2)
    actual = Counter(pair(f["w"], f["h"]) for f in faces)
    if actual != expected:
        errors.append("face_dimensions_disagree_with_size")
    eq = lambda a, b: math.isclose(a, b, abs_tol=1e-5)
    graph = [set() for _ in faces]
    for i, a in enumerate(faces):
        for j, b in enumerate(faces[i + 1 :], i + 1):
            vertical = (
                (eq(a["x"] + a["w"], b["x"]) or eq(b["x"] + b["w"], a["x"]))
                and eq(a["y"], b["y"])
                and eq(a["h"], b["h"])
            )
            horizontal = (
                (eq(a["y"] + a["h"], b["y"]) or eq(b["y"] + b["h"], a["y"]))
                and eq(a["x"], b["x"])
                and eq(a["w"], b["w"])
            )
            if vertical or horizontal:
                graph[i].add(j)
                graph[j].add(i)
    seen = {0}
    todo = [0]
    while todo:
        for j in graph[todo.pop()] - seen:
            seen.add(j)
            todo.append(j)
    if len(seen) != 6:
        errors.append("not_connected_by_full_face_edges")
    return errors


OUT.mkdir(exist_ok=True)
(OUT / "prompt.txt").write_text(PROMPT, encoding="utf-8")
save(
    OUT / "plan.json",
    {
        "created_at": datetime.now(UTC).isoformat(),
        "case_ids": IDS,
        "model": MODEL,
        "arms": ["corrected0shot", "corrected2shot"],
        "example_ids": EXAMPLES,
        "parallel_cases_per_wave": 3,
        "wave_order": ["corrected0shot", "corrected2shot"],
        "repetitions": 1,
        "only_treatment_difference": "2 other-problem teacher images and JSON examples",
        "shared_corrections": [
            "single box support scope",
            "full problem context plus CV candidate",
            "face coordinates same units as size",
            "null vertexLabels normalized to 8 unknown labels only for cube/cuboid",
            "basic geometry gate and browser closure gate",
        ],
        "product_integration": False,
        "timing": "browser input fetch/decode/CV + local HTTP/model/schema/gate + actual Viewer onReady; no human capture/selection time",
        "scope": "three previously diagnosed development problems, no generalization claim",
        "prompt_sha256": hashlib.sha256(PROMPT.encode()).hexdigest(),
    },
)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5194", "http://127.0.0.1:5194"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/cases")
def cases():
    return {
        "cases": [
            {"id": i, "problem_url": f"http://localhost:8768/assets/{i}"} for i in IDS
        ]
    }


@app.get("/assets/{cid}")
def asset(cid: str):
    if cid not in IDS:
        return {"error": "unknown case"}
    return FileResponse(ROOT / f"1. fewshot/{cid}/problem.jpg", media_type="image/jpeg")


@app.post("/flow")
def flow(
    file: UploadFile, problem: UploadFile, id: str = Form(...), arm: str = Form(...)
):
    start = time.perf_counter()
    if id not in IDS or arm not in ["corrected0shot", "corrected2shot"]:
        return {"decision": "error", "scene": None}
    folder = OUT / "runs" / arm
    result = {
        "id": id,
        "arm": arm,
        "model": MODEL,
        "started_at": datetime.now(UTC).isoformat(),
        "decision": "error",
        "scene": None,
        "diagnostics": {"format_normalizations": [], "gate_errors": []},
    }
    selected = file.file.read()
    whole = problem.file.read()
    result["input_sha256"] = {
        "file": hashlib.sha256(selected).hexdigest(),
        "problem": hashlib.sha256(whole).hexdigest(),
    }
    parts = []
    if arm == "corrected2shot":
        for eid in EXAMPLES:
            label = json.loads(
                (ROOT / f"2. teaching data/{eid}/bank50.reviewed.json").read_text(
                    encoding="utf-8"
                )
            )
            teacher = {
                "decision": "scene",
                "dimension_source": label.get(
                    "dimension_source", label.get("dimension_policy")
                ),
                "assumptions": label.get("assumptions", []),
                "scene": label["scene_candidate"],
            }
            parts.extend(
                [
                    types.Part.from_text(text="다른 문제의 검수 예시"),
                    types.Part.from_bytes(
                        data=(ROOT / f"1. fewshot/{eid}/shape.jpg").read_bytes(),
                        mime_type="image/jpeg",
                    ),
                    types.Part.from_text(text=json.dumps(teacher, ensure_ascii=False)),
                ]
            )
    parts.extend(
        [
            types.Part.from_text(text="대상 문제 전체"),
            types.Part.from_bytes(
                data=whole, mime_type=problem.content_type or "image/jpeg"
            ),
            types.Part.from_text(text="자동 후보 확대; 불완전하면 전체 문제를 우선"),
            types.Part.from_bytes(
                data=selected, mime_type=file.content_type or "image/jpeg"
            ),
        ]
    )
    client = genai.Client(api_key=KEY, http_options=types.HttpOptions(timeout=90000))
    model_start = time.perf_counter()
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=parts,
            config=types.GenerateContentConfig(
                system_instruction=PROMPT,
                response_mime_type="application/json",
                temperature=0,
            ),
        )
        result["diagnostics"]["model_seconds"] = time.perf_counter() - model_start
        result["diagnostics"]["usage"] = (
            response.usage_metadata.model_dump(mode="json")
            if response.usage_metadata
            else None
        )
        result["diagnostics"]["resolved_model"] = getattr(
            response, "model_version", None
        )
        result["raw_text"] = response.text
        output = json.loads(response.text or "{}")
        result["output"] = output
        result["decision"] = output.get("decision", "uncertain")
        scene = output.get("scene")
        if result["decision"] == "scene" and isinstance(scene, dict):
            scene = json.loads(json.dumps(scene))
            if (
                scene.get("shape") in ["cube", "cuboid"]
                and "vertexLabels" in scene
                and scene["vertexLabels"] is None
            ):
                scene["vertexLabels"] = [None] * 8
                result["diagnostics"]["format_normalizations"].append(
                    "null_vertexLabels_to_8_unknowns"
                )
            try:
                ShapeScene.model_validate(scene)
                result["diagnostics"]["schema_valid"] = True
                errors = grid_gate(scene)
                result["diagnostics"]["gate_errors"] = errors
                if errors:
                    result["decision"] = "uncertain"
                else:
                    result["scene"] = scene
            except ValidationError:
                result["diagnostics"]["schema_valid"] = False
                result["decision"] = "uncertain"
        elif scene is not None:
            result["diagnostics"]["gate_errors"].append(
                "inconsistent_decision_and_scene"
            )
    except Exception as error:  # noqa: BLE001 — 독립 실험에서 실패 유형을 기록하고 다음 사례를 유지.
        result["diagnostics"].update(
            error_type=type(error).__name__, error_code=getattr(error, "code", None)
        )
    finally:
        client.close()
    result["diagnostics"]["server_seconds"] = time.perf_counter() - start
    save(folder / f"{id}.json", result)
    print(
        id,
        arm,
        result["decision"],
        round(result["diagnostics"]["server_seconds"], 2),
        flush=True,
    )
    return {k: result[k] for k in ["id", "arm", "decision", "scene", "diagnostics"]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8768)
