"""사진 없이 기록의 숫자만 집계한다. 학생 선택은 정답의 대리 지표다."""

import argparse
import json
import math
from pathlib import Path


def box(value):
    if not isinstance(value, dict):
        return None
    values = [value.get(k) for k in ("x", "y", "w", "h")]
    if any(
        not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v)
        for v in values
    ):
        return None
    x, y, w, h = values
    return (
        (x, y, w, h)
        if x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= 1.001 and y + h <= 1.001
        else None
    )


def iou(a, b):
    intersection = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])) * max(
        0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
    )
    return intersection / (a[2] * a[3] + b[2] * b[3] - intersection)


def match(predicted, selected):
    """한 네모를 중복 채점하지 않는 최대 일대일 매칭."""
    assigned = {}

    def visit(index, seen):
        for target, wanted in enumerate(selected):
            if target in seen or iou(predicted[index], wanted) < 0.5:
                continue
            seen.add(target)
            if target not in assigned or visit(assigned[target], seen):
                assigned[target] = index
                return True
        return False

    tp = sum(visit(i, set()) for i in range(len(predicted)))
    return {"matched": tp, "extra": len(predicted) - tp, "missed": len(selected) - tp}


def distill(root: Path):
    totals = {
        "sessions": 0,
        "invalid": 0,
        "matched": 0,
        "extra": 0,
        "missed": 0,
        "box_sessions": 0,
        "full_photo_or_unlabelled": 0,
        "right": 0,
        "wrong": 0,
        "unjudged": 0,
        "reads": 0,
        "read_errors": 0,
    }
    seconds = []
    for path in sorted(root.glob("*/session.json")):
        totals["sessions"] += 1
        try:
            session = json.loads(path.read_text(encoding="utf-8-sig"))
            suggested = [box(b) for b in session.get("suggested", [])]
            raw = session.get("read", [])
            selected = [box(b) for b in raw if b is not None]
            if None in suggested or None in selected:
                raise ValueError("잘못된 네모")
            events = session.get("events", [])
            if not isinstance(events, list) or any(
                not isinstance(e, dict) for e in events
            ):
                raise ValueError("잘못된 피드백")
            if raw and all(b is not None for b in raw):
                for key, value in match(suggested, selected).items():
                    totals[key] += value
                totals["box_sessions"] += 1
            else:
                totals["full_photo_or_unlabelled"] += 1
            feedback = [
                e.get("value")
                for e in events
                if e.get("event") == "verdict" and e.get("value") in ("right", "wrong")
            ]
            totals[feedback[-1] if feedback else "unjudged"] += 1
        except (ValueError, TypeError, AttributeError, OSError):
            totals["invalid"] += 1
            continue
        for read in path.parent.glob("read-*"):
            if not read.is_dir():
                continue
            totals["reads"] += 1
            try:
                result = json.loads(
                    (read / "result.json").read_text(encoding="utf-8-sig")
                )
                meta = json.loads((read / "meta.json").read_text(encoding="utf-8-sig"))
                if result.get("error") or result.get("detail"):
                    totals["read_errors"] += 1
                elapsed = meta.get("seconds")
                if (
                    isinstance(elapsed, (float, int))
                    and math.isfinite(elapsed)
                    and elapsed >= 0
                ):
                    seconds.append(elapsed)
            except (ValueError, TypeError, AttributeError, OSError):
                totals["invalid"] += 1
    totals["timed_reads"] = len(seconds)
    totals["mean_seconds"] = sum(seconds) / len(seconds) if seconds else None
    return {"metric": "student_selection_proxy_iou_0.5", "counts": totals}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.cases.is_dir():
        parser.error("cases 폴더가 없음")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(distill(args.cases), ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
