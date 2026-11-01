"""오프라인 시연용 검수 은행. 사진/API 키를 저장소에 복사하지 않는다.

기존 에이전트 검수 라벨과 원본 대조한 전개도 참조에서 후보를 구성한다.
치수 정규화와 정밑면 가정은 분리하며 사람이 승인한 gold를 주장하지 않는다.
실행: python bank50_verify.py --tool-root ... --data-root ... --repo ...
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool-root", type=Path, required=True)
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--repo", type=Path, required=True)
    args = parser.parse_args()
    sys.path.insert(0, str(args.repo / "backend"))
    from app.ai.schema import ShapeScene

    out = args.data_root / "7. bank50" / "verified"
    cases = read(args.tool_root / "eval-20261101/cases.json") + read(
        args.data_root / "3. evaluation/hour1/cases.json"
    )
    for case in cases:
        case["previous_split"] = case.get("split")
        case["split"] = "demo_development"
        case["item_type"] = (
            "worked_example"
            if case["id"] in ["D04", "E05"]
            else "selected_option"
            if case["id"] in ["E04", "E06", "H09", "H10"]
            else "problem"
        )
        case["problem_group_id"] = "existing-" + case["id"]
        case["grouping_note"] = (
            "기존24개 안에서 중복문제 없음으로 검토. 새 A/B 샘플과의 중복은 상위 통합 단계에서 출처/문제번호로 대조 필요."
        )
    write(out / "existing-cases.json", cases)

    bank = []
    for ident in ["D01", "D02", "E01", "E02", "E04", "E06", "E07"]:
        label = read(
            args.data_root / "2. teaching data" / ident / "label.reviewed.json"
        )
        bank.append(
            {
                "id": ident,
                "scene": copy.deepcopy(label["scene_candidate"]),
                "source": "preserved_existing_reviewed_bank",
                "dimension_policy": label["dimension_policy"],
                "notes": label.get("review_evidence", ""),
                "preserved": True,
            }
        )
    refs = read(args.data_root / "3. evaluation/hour1/geometry-reference.json")[
        "references"
    ]
    sizes = {
        "H01": (4, 7, 6),
        "H02": (9, 3, 8),
        "H03": (7,),
        "H04": (1,),
        "H05": (3, 2, 4),
        "H06": (3, 3, 5),
    }
    for ident, size in sizes.items():
        cube = len(size) == 1
        faces = [
            dict(zip(["x", "y", "w", "h"], rect)) for rect in refs[ident]["rectangles"]
        ]
        if ident == "H04":
            for face, text in zip(faces, ["㉠", "㉡", "6", "3", "㉢", "5"]):
                face.update(text=text, fill=True)
        if ident == "H05":
            for face, text in zip(faces, ["㉮", "㉯", "㉰", "㉱", "㉲", "㉳"]):
                face.update(text=text, fill=True)
        if ident in ["H02", "H06"]:
            for face in faces:
                face["fill"] = True
        labels = []
        if ident == "H02":
            labels = [
                (0, 0, "ㄱ"),
                (9, 0, "ㅎ"),
                (0, 3, "ㄴ"),
                (9, 3, "ㅍ"),
                (12, 3, "ㅌ"),
                (21, 3, "ㅋ"),
                (24, 3, "ㅊ"),
                (0, 11, "ㄷ"),
                (9, 11, "ㄹ"),
                (12, 11, "ㅁ"),
                (21, 11, "ㅇ"),
                (24, 11, "ㅈ"),
                (12, 14, "ㅂ"),
                (21, 14, "ㅅ"),
            ]
        if ident == "H05":
            labels = [
                (0, 0, "ㄱ"),
                (4, 0, "ㅎ"),
                (7, 0, "ㅍ"),
                (0, 2, "ㄴ"),
                (4, 2, "ㄷ"),
                (7, 2, "ㅌ"),
                (9, 2, "ㅋ"),
                (12, 2, "ㅊ"),
                (4, 6, "ㄹ"),
                (7, 6, "ㅅ"),
                (9, 6, "ㅇ"),
                (12, 6, "ㅈ"),
                (4, 8, "ㅁ"),
                (7, 8, "ㅂ"),
            ]
        scene = {
            "shape": "cube" if cube else "cuboid",
            "size": {"edge": size[0]}
            if cube
            else dict(zip(["width", "depth", "height"], size)),
            "vertexLabels": [None] * 8,
            "lines": [],
            "net": {
                "layout": "grid",
                "faces": faces,
                "cornerLabels": [dict(zip(["x", "y", "text"], p)) for p in labels],
                "lines": [],
            },
        }
        notes = "원본 면 위치·기호를 직접 대조."
        if ident == "H01":
            notes += " 치수는 왼쪽 입체의4·7·6에서 가져옴. 길이 미지수 ㄱ/ㄴ은 변 라벨 필드가 없어 별도 annotation에만 보존."
        if ident == "H03":
            notes += " 외곽 종이 경계를 면으로 세지 않음."
        if ident == "H04":
            notes += " 주사위 눈점은 숫자로 의미를 보존하며 점 배치 그림 자체는 재현하지 않음."
        if ident == "H05":
            notes += " 3×2×4는 설명용 가정 비율이며 원본 실측값 아님."
        bank.append(
            {
                "id": ident,
                "scene": scene,
                "source": "source_image_and_geometry_reference_agent_review",
                "dimension_policy": "illustrative_normalized_not_measured"
                if ident in ["H04", "H05"]
                else "printed_dimensions",
                "notes": notes,
                "preserved": False,
            }
        )
    for ident, shape, size in [
        ("H09", "cylinder", {"radius": 1, "height": 2}),
        ("H12", "cuboid", {"width": 4, "depth": 8, "height": 6}),
    ]:
        bank.append(
            {
                "id": ident,
                "scene": {
                    "shape": shape,
                    "size": size,
                    "vertexLabels": [None] * (8 if shape == "cuboid" else 0),
                    "lines": [],
                    "net": {"layout": "cross" if shape == "cuboid" else "default"},
                },
                "source": "source_image_agent_review",
                "dimension_policy": "illustrative_normalized_not_measured"
                if ident == "H09"
                else "printed_dimensions",
                "notes": "지정 보기 가만 표현; 예시 크기"
                if ident == "H09"
                else "인쇄된4·8·6cm 보존",
                "preserved": False,
            }
        )
    labels = []
    index = {x["id"]: x for x in bank}
    for case in cases:
        ident = case["id"]
        entry = index.get(ident)
        label = {
            "id": ident,
            "split": "demo_development",
            "item_type": case["item_type"],
            "problem_group_id": case["problem_group_id"],
            "kind": case["kind"],
            "human_approved": False,
            "scene_available": bool(entry),
        }
        if entry:
            ShapeScene.model_validate(entry["scene"])
            entry["schema_pass"] = True
            entry["scene_sha256"] = hashlib.sha256(
                json.dumps(entry["scene"], ensure_ascii=False, sort_keys=True).encode()
            ).hexdigest()
            label.update(
                status="agent_reviewed_scene_candidate",
                dimension_policy=entry["dimension_policy"],
                notes=entry["notes"],
                scene_candidate=entry["scene"],
                approved_for_prompt=True,
                dimension_source="printed"
                if entry["dimension_policy"] == "printed_dimensions"
                else "normalized",
                assumptions=[entry["notes"]],
                geometry_verified=True,
                runtime_verified=False,
            )
        else:
            label.update(
                scene_candidate=None,
                approved_for_prompt=False,
                dimension_source="unknown",
                assumptions=[],
                geometry_verified=False,
                runtime_verified=False,
            )
            label["status"] = (
                "conditional_example_not_exact"
                if ident in ["D04", "E05"]
                else "needs_review_incomplete"
                if ident == "H11"
                else "current_contract_unsupported"
            )
            label["notes"] = (
                "정밑면 근거가 없어 정확 복원 은행에 넣지 않음"
                if ident in ["D04", "E05"]
                else "미완성 획을 임의 완성하지 않음"
                if ident == "H11"
                else "의미 인식 가능 여부와 현재 계약의 원본보존 표시 가능 여부는 별개"
            )
        labels.append(label)
    write(out / "scene-bank.json", bank)
    write(out / "labels.json", labels)
    write(out / "rendering/scenes.json", bank)
    summary = {
        "items": len(cases),
        "problem_items": sum(x["item_type"] == "problem" for x in cases),
        "worked_examples": 2,
        "selected_options": 4,
        "scene_candidates": len(bank),
        "schema_pass": len(bank),
        "runtime_pending": len(bank),
        "no_exact_scene": len(cases) - len(bank),
        "original7_preserved": True,
        "generalization_claim": False,
    }
    write(out / "summary.json", summary)
    runtime_file = out / "rendering/render-results.json"
    if runtime_file.exists():
        runtime = {x["id"]: x for x in read(runtime_file)["results"]}
        passed = 0
        for label in labels:
            found = runtime.get(label["id"])
            entry = index.get(label["id"])
            if found and entry and found["scene"] == entry["scene"]:
                ok = bool(found["supported"] and found["meshstats"]["finite"])
                label["runtime_verified"] = ok
                label["runtime_check"] = {
                    "mesh": found["meshstats"],
                    "geometry": found["geometry"],
                    "engine": "existing_buildStage_chrome_software_webgl",
                    "labels_rendered": False,
                }
                passed += int(ok)
        summary.update(runtime_verified=passed, runtime_pending=len(bank) - passed)
        write(out / "labels.json", labels)
        write(out / "summary.json", summary)
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
