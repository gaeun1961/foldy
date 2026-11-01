"""외부 문제 3개에서 고정 3-shot/0-shot 비교. 제품 API와 분리된 수동 실험.

manifest: examples/queries 각각 3개, 각 항목 id, shape, problem(선택),
teacher 또는 teacher_path. 상대 경로는 manifest 폴더 기준이다.
query 정답은 API 응답 뒤 평가에서만 읽으며 프롬프트에 넣지 않는다.
"""

import argparse
import concurrent.futures
import datetime
import hashlib
import json
import mimetypes
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))
from app.ai.schema import ShapeScene

SYSTEM = """너는 사전에 준비한 학습지의 도형을 읽는다. 아래 예시 그림과 교사 JSON을 참고해 마지막 대상 그림을 분석한다. 문제 글은 보조 문맥이며 마지막 도형 확대가 판단 대상이다. 주변 다른 도형을 합성체로 묶지 않는다. 인쇄된 것만 보존하고 학생 풀이/채점은 치수나 라벨로 넣지 않는다.
응답 JSON: {kind,decision,dimension_source,assumptions,scene}. decision은 scene/unsupported/uncertain. scene은 예시와 같은 Foldy ShapeScene 계약. 없는 꼭짓점은 null, net과 lines를 포함하고 problem은 넣지 않는다. 그림과 동일한 면 연결/면의 글자/꼭짓점 라벨/색칠을 보존한다. 잘못되거나 미완성인 전개도를 임의 완성하지 않는다.
실제 치수가 없으면 예시에서 정규화한 크기를 사용해도 되며 dimension_source=normalized와 가정을 명시한다. 원뿔대는 원뿔로 바꾸지 않는다. 일반 비정삼각형 밑면을 정삼각형으로 바꾸지 않는다. 교사 예시와 다른 대상이면 무조건 정답을 복사하지 않는다. 설명문 없이 JSON만 반환."""


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(scene):
    r = ShapeScene.model_validate(scene).model_dump(mode="json", exclude_none=True)
    r.pop("problem", None)
    r.pop("photoBox", None)
    n = r.get("net", {})
    if n.get("layout") == "grid":
        for f in n["faces"]:
            for key in ["fill", "text"]:
                if not f.get(key):
                    f.pop(key, None)
        n["faces"] = sorted(n["faces"], key=lambda f: (f["x"], f["y"], f["w"], f["h"]))
        n["cornerLabels"] = sorted(
            n.get("cornerLabels", []), key=lambda f: (f["x"], f["y"], f["text"])
        )
        n["lines"] = sorted(
            n.get("lines", []), key=lambda f: json.dumps(f, sort_keys=True)
        )
    return r


def teacher_for(case, base):
    teacher = case.get("teacher")
    if teacher is None and case.get("teacher_path"):
        teacher = read_json(base / case["teacher_path"])
    if teacher is None:
        return None
    if "scene_candidate" in teacher:
        teacher = {
            "kind": teacher.get("kind"),
            "decision": "scene",
            "dimension_source": teacher.get("dimension_source", "printed"),
            "assumptions": teacher.get("assumptions", []),
            "scene": teacher["scene_candidate"],
        }
    elif "shape" in teacher:
        teacher = {
            "kind": case.get("kind"),
            "decision": "scene",
            "dimension_source": case.get("dimension_source", "printed"),
            "assumptions": case.get("assumptions", []),
            "scene": teacher,
        }
    if teacher.get("scene") is not None:
        canonical(teacher["scene"])
    return teacher


def prepare(manifest_path):
    manifest = read_json(manifest_path)
    base = manifest_path.parent
    examples, queries = manifest["examples"], manifest["queries"]
    if len(examples) != 3 or len(queries) != 3:
        raise ValueError("examples와 queries는 각각 3개여야 합니다")
    ids = [c["id"] for c in examples + queries]
    if len(set(ids)) != 6 or any(not re.fullmatch(r"[A-Za-z0-9_-]+", i) for i in ids):
        raise ValueError("ID는 중복 없는 영문/숫자/_/-여야 합니다")
    example_hashes = set()
    for case in examples + queries:
        case["images"] = {}
        for key in ["shape", "problem"]:
            if case.get(key):
                path = (base / case[key]).resolve()
                data = path.read_bytes()
                case["images"][key] = {
                    "path": str(path),
                    "data": data,
                    "sha256": digest(data),
                    "mime": mimetypes.guess_type(path)[0] or "image/jpeg",
                }
        if "shape" not in case["images"]:
            raise ValueError("shape 이미지가 필요합니다")
    for case in examples:
        case["example_teacher"] = teacher_for(case, base)
        if case["example_teacher"] is None:
            raise ValueError("예시 정답이 없습니다")
        example_hashes.update(i["sha256"] for i in case["images"].values())
    for case in queries:
        if example_hashes.intersection(i["sha256"] for i in case["images"].values()):
            raise ValueError("대상 이미지와 예시 이미지가 중복됩니다")
    return manifest, base


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--conditions", choices=["both", "zero", "few"], default="both")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    manifest, base = prepare(args.manifest.resolve())
    conditions = ["zero", "few"] if args.conditions == "both" else [args.conditions]
    model = manifest.get("model", "gemini-3.5-flash-lite")
    # 동일한 계약 설명을 양 조건에 제공한다. 정답 예시 유무만 달라진다.
    system = (
        SYSTEM
        + "\n공통 ShapeScene JSON Schema:\n"
        + json.dumps(ShapeScene.model_json_schema(), ensure_ascii=False)
    )
    protocol = {
        "mode": "unseen_query_fixed_examples",
        "model": model,
        "conditions": conditions,
        "workers": 3,
        "requests": len(conditions) * 3,
        "timeout_ms": 45000,
        "sdk_attempts": 1,
        "temperature": 0,
        "example_ids": [e["id"] for e in manifest["examples"]],
        "query_ids": [q["id"] for q in manifest["queries"]],
        "query_teacher_in_prompt": False,
        "manual_crop": True,
        "system_sha256": digest(system.encode()),
        "manifest_sha256": digest(args.manifest.read_bytes()),
        "note": "수동 크롭 3문제 탐색 실험. 자동 CV/일반화 성능/증류 학습의 검증 아님. 원본 bank50 실험과 달리 두 조건에 공통 JSON Schema 추가.",
    }
    if args.dry_run:
        print(json.dumps(protocol, ensure_ascii=False, indent=2))
        return
    from dotenv import dotenv_values
    from google import genai
    from google.genai import types

    key = dotenv_values(REPO / "backend/.env").get("LLM_API_KEY")
    if not key:
        raise RuntimeError("LLM_API_KEY가 설정되지 않았습니다")
    args.output.mkdir(parents=True, exist_ok=False)
    save(args.output / "protocol.json", protocol)
    (args.output / "system.txt").write_text(system, encoding="utf-8")

    def image_part(case, field):
        im = case["images"][field]
        return types.Part.from_bytes(data=im["data"], mime_type=im["mime"])

    def run_query(query):
        records = []
        for condition in conditions:
            folder = args.output / query["id"] / condition
            folder.mkdir(parents=True)
            parts = []
            if condition == "few":
                for ex in manifest["examples"]:
                    parts.extend(
                        [
                            types.Part.from_text(text="검수 예시 그림:"),
                            image_part(ex, "shape"),
                            types.Part.from_text(
                                text="교사 예시 정답: "
                                + json.dumps(ex["example_teacher"], ensure_ascii=False)
                            ),
                        ]
                    )
            if "problem" in query["images"]:
                parts.extend(
                    [
                        types.Part.from_text(text="이제 대상 문제 문맥:"),
                        image_part(query, "problem"),
                    ]
                )
            parts.extend(
                [
                    types.Part.from_text(text="분석할 대상 도형 확대:"),
                    image_part(query, "shape"),
                ]
            )
            record = {
                "id": query["id"],
                "condition": condition,
                "requested_model": model,
                "example_count": 3 if condition == "few" else 0,
                "example_ids": protocol["example_ids"] if condition == "few" else [],
                "query_teacher_in_prompt": False,
                "visual_evaluation_status": "pending",
                "expected_checklist": query.get("expected_checklist", []),
                "schema_valid": None,
                "image_hashes": {k: i["sha256"] for k, i in query["images"].items()},
                "started_at": datetime.datetime.now(datetime.UTC).isoformat(),
            }
            client = genai.Client(
                api_key=key,
                http_options=types.HttpOptions(
                    timeout=45000, retry_options=types.HttpRetryOptions(attempts=1)
                ),
            )
            start = time.perf_counter()
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=parts,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        response_mime_type="application/json",
                        temperature=0,
                    ),
                )
                record["seconds"] = round(time.perf_counter() - start, 3)
                (folder / "response.txt").write_text(
                    response.text or "", encoding="utf-8"
                )
                record["usage"] = (
                    response.usage_metadata.model_dump(mode="json")
                    if response.usage_metadata
                    else None
                )
                record["resolved_model"] = getattr(response, "model_version", None)
                record["output"] = json.loads(response.text or "{}")
                record["status"] = "response"
                scene = record["output"].get("scene")
                try:
                    predicted = canonical(scene)
                    record["schema_valid"] = True
                except (ValueError, TypeError, KeyError):
                    predicted = None
                    record["schema_valid"] = False
                # 정답은 API 호출 완료 뒤 평가에서만 로드한다.
                teacher = teacher_for(query, base)
                if teacher:
                    save(folder / "evaluation-teacher.json", teacher)
                    expected = (
                        canonical(teacher["scene"]) if teacher.get("scene") else None
                    )
                    record["teacher_scene_exact_match"] = (
                        predicted is not None and predicted == expected
                    )
                    record["kind_match"] = record["output"].get("kind") == teacher.get(
                        "kind"
                    )
                else:
                    record["teacher_scene_exact_match"] = None
            except Exception as error:  # noqa: BLE001 개별 실패를 기록하고 나머지 사례는 계속한다.
                record["status"] = "error"
                record["error_type"] = type(error).__name__
                record["error_code"] = getattr(error, "code", None)
            finally:
                record.setdefault("seconds", round(time.perf_counter() - start, 3))
                client.close()
            save(folder / "result.json", record)
            print(
                query["id"],
                condition,
                record["status"],
                record.get("schema_valid"),
                record["seconds"],
                flush=True,
            )
            records.append(record)
        return records

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = [r for rows in pool.map(run_query, manifest["queries"]) for r in rows]
    save(args.output / "results.json", results)


if __name__ == "__main__":
    main()
