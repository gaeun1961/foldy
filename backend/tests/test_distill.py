import json
import tempfile
from pathlib import Path

from evals.distill import box, distill, match


def main():
    a = (0, 0, 0.5, 0.5)
    assert match([a, a], [a]) == {"matched": 1, "extra": 1, "missed": 0}
    assert match([], [a])["missed"] == 1
    assert box({"x": 0, "y": 0, "w": float("nan"), "h": 1}) is None
    assert box({"x": 0, "y": 0, "w": -1, "h": 1}) is None
    with tempfile.TemporaryDirectory() as name:
        root = Path(name)
        (root / "one").mkdir()
        b = dict(zip(("x", "y", "w", "h"), a))
        (root / "one/session.json").write_text(
            json.dumps(
                {
                    "suggested": [b, b],
                    "read": [b],
                    "events": [
                        {"event": "verdict", "value": "right"},
                        {"event": "verdict", "value": "wrong"},
                    ],
                }
            ),
            encoding="utf-8",
        )
        (root / "broken").mkdir()
        (root / "broken/session.json").write_text("broken", encoding="utf-8")
        counts = distill(root)["counts"]
        assert counts["sessions"] == 2 and counts["invalid"] == 1
        assert counts["matched"] == 1 and counts["extra"] == 1
        assert counts["right"] == 0 and counts["wrong"] == 1
        assert counts["mean_seconds"] is None
    print("distill: 일대일 매칭·마지막 피드백·손상 기록 통과")


if __name__ == "__main__":
    main()
