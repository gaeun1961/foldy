"""동결된 배치를 요청한 폴더 구조로 복사한다. 기존 파일은 덮어쓰지 않는다."""

import hashlib
import json
from pathlib import Path

ROOT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷")
BANK = ROOT / "7. bank50"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() == data:
            return path, "identical_existing"
        path = path.with_name(path.stem + ".bank50-" + digest(data)[:12] + path.suffix)
        if path.exists():
            if path.read_bytes() == data:
                return path, "identical_versioned"
            raise RuntimeError("Hash suffix collision")
    with path.open("xb") as handle:
        handle.write(data)
    return path, "created"


def save_json(path, value):
    return safe_bytes(
        path, json.dumps(value, ensure_ascii=False, indent=2).encode("utf8")
    )


def main():
    cases = []
    labels = []
    origins = {}
    sources = [(BANK / "verified/existing-cases.json", BANK / "verified/labels.json")]
    sources += [
        (BANK / f"batches/{batch}/cases.json", BANK / f"batches/{batch}/labels.json")
        for batch in ["a", "b", "c"]
    ]
    for casefile, labelfile in sources:
        cs = json.loads(casefile.read_text(encoding="utf8"))
        ls = json.loads(labelfile.read_text(encoding="utf8"))
        cases.extend(cs)
        labels.extend(ls)
        for row in cs:
            origins[row["id"]] = {
                "case_manifest": str(casefile),
                "label_manifest": str(labelfile),
                "case_manifest_sha256": digest(casefile.read_bytes()),
                "label_manifest_sha256": digest(labelfile.read_bytes()),
            }
    assert len(cases) == len(labels) == len({x["id"] for x in cases}) == 52
    labelmap = {x["id"]: x for x in labels}
    maincases = []
    refs = []
    manifestlabels = []
    bank = []
    audit = []
    for case in cases:
        ident = case["id"]
        label = labelmap[ident]
        provenance = dict(case)
        provenance.update(origins[ident])
        provenance["published_images"] = {}
        for role in ["problem", "shape"]:
            data = Path(case[role]).read_bytes()
            dest, status = safe_bytes(ROOT / "1. fewshot" / ident / f"{role}.jpg", data)
            assert digest(dest.read_bytes()) == digest(data)
            provenance["published_images"][role] = {
                "path": str(dest),
                "sha256": digest(data),
                "status": status,
            }
            audit.append(
                {"id": ident, "role": role, "status": status, "path": str(dest)}
            )
        reviewed, _ = save_json(
            ROOT / "2. teaching data" / ident / "bank50.reviewed.json", label
        )
        provpath, _ = save_json(
            ROOT / "2. teaching data" / ident / "bank50.provenance.json", provenance
        )
        entry = {
            "id": ident,
            "title": case.get("title"),
            "problem": provenance["published_images"]["problem"]["path"],
            "shape": provenance["published_images"]["shape"]["path"],
            "source_case_manifest": origins[ident]["case_manifest"],
            "reviewed_label": str(reviewed),
            "provenance": str(provpath),
            "split": "demo_development",
        }
        (refs if ident in ["D04", "E05"] else maincases).append(entry)
        manifestlabels.append(
            {
                "id": ident,
                "path": str(reviewed),
                "source": origins[ident]["label_manifest"],
            }
        )
        if label.get("approved_for_prompt"):
            assert ident not in ["D04", "E05"]
            scene = label.get("scene_candidate")
            assert scene is not None
            bank.append(
                {
                    "id": ident,
                    "scene": scene,
                    "approved_for_prompt": True,
                    "reviewed_label": str(reviewed),
                    "provenance": str(provpath),
                    "dimension_source": label.get(
                        "dimension_source", label.get("dimension_policy")
                    ),
                    "assumptions": label.get("assumptions", []),
                    "human_approved": False,
                    "source_batch": origins[ident]["label_manifest"],
                    "scene_sha256": digest(
                        json.dumps(scene, sort_keys=True, ensure_ascii=False).encode(
                            "utf8"
                        )
                    ),
                }
            )
    assert len(maincases) == 50 and len(refs) == 2 and len(bank) == 35
    bankpath, _ = save_json(BANK / "scene-bank.json", bank)
    teachingbank, _ = save_json(ROOT / "2. teaching data/scene-bank-bank50.json", bank)
    manifest = {
        "scope": "50개 고유 문제 + 참고 설명 예시2개. 총52자료 보존. 모두 demo_development이며 일반화평가 아님.",
        "main_case_count": len(maincases),
        "reference_example_count": len(refs),
        "label_count": len(labels),
        "approved_scene_count": len(bank),
        "main_cases": maincases,
        "reference_examples": refs,
        "labels": manifestlabels,
        "approved_scene_bank": {
            "path": str(bankpath),
            "teaching_copy": str(teachingbank),
            "count": len(bank),
            "ids": [x["id"] for x in bank],
        },
        "source_batches_unchanged": True,
        "overwrite_policy": "동일hash파일은검증만; 다르면hash접미사별도파일로보존",
        "human_approved": False,
    }
    manifestpath, _ = save_json(BANK / "manifest.json", manifest)
    save_json(
        BANK / "packaging-audit.json",
        {
            "file_count": len(audit),
            "created_images": sum(x["status"] == "created" for x in audit),
            "existing_images_verified": sum(
                x["status"].startswith("identical") for x in audit
            ),
            "files": audit,
        },
    )
    print(
        json.dumps(
            {
                "main": 50,
                "reference": 2,
                "labels": 52,
                "approved": 35,
                "images": len(audit),
                "manifest": str(manifestpath),
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
