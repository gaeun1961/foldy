"""심사 일관성·자료 분리·입력 경로 검증. 실제 모델을 호출하지 않는다."""

import json
import tempfile
from pathlib import Path

from pydantic import ValidationError

from evals.judge import Review, prepare, reconcile, run


def main():
    data = dict.fromkeys(
        ("shape", "dimensions", "layout", "labels", "lines", "scope"), "pass"
    )
    good = Review(verdict="correct", reason="사진과 일치", **data)
    bad_data = {**data, "labels": "fail"}
    bad = Review(verdict="incorrect", reason="라벨 위치 다름", **bad_data)
    assert reconcile(good, good) == "agreed_correct"
    assert reconcile(good, bad) == "human_review"
    try:
        Review(verdict="correct", reason="오류", **bad_data)
        raise AssertionError("모순된 심사를 허용함")
    except ValidationError:
        pass
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "image.png").write_bytes(b"synthetic-input")
        (root / "prediction.json").write_text('{"notSolid":true}', encoding="utf-8")
        row = {
            "id": "A",
            "kind": "flat",
            "split": "development",
            "image": "image.png",
            "prediction": "prediction.json",
        }
        manifest = root / "manifest.json"
        manifest.write_text(json.dumps([row]), encoding="utf-8")
        cases = prepare(manifest)
        assert len(cases[0]["image_sha256"]) == 64
        run(cases, root / "out", False)
        result = json.loads((root / "out/summary.json").read_text())
        assert result[0]["status"] == "prepared"
        assert result[0]["human_approved"] is False
        for invalid in (
            [row, row],
            [{**row, "id": "../outside"}],
            [row, {**row, "id": "B", "split": "heldout"}],
        ):
            manifest.write_text(json.dumps(invalid), encoding="utf-8")
            try:
                prepare(manifest)
                raise AssertionError("잘못된 자료를 허용함")
            except ValueError:
                pass
    print("심사 검증 통과")


if __name__ == "__main__":
    main()
