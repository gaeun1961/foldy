"""비전 LLM 정확도 측정 (TODO-7). 실행: backend 폴더에서 python -m evals.vision_eval [--model 모델이름] [--engine api|agy]

photos/ 의 학습지 사진마다 vision.recognize 를 불러 answers.json 의 정답과 비교한다.
- 사진은 저작권 때문에 git 에 올리지 않는다 (photos/ 는 .gitignore)
- answers.json: {"사진 파일 이름": {"scene": 정답 ShapeScene, "skip": [채점에서 뺄 항목], "note": 메모}}.
  사진에서 알 수 없는 항목(치수 □ 등)이나 계약으로 못 담는 것은 skip 에 넣는다. 정답이 없는 사진은 건너뛴다
- 채점 항목(FIELDS): 도형, 치수, 전개도(cross/grid 와 grid 면 배치), 라벨, 면 표시(grid 글자·색칠), 선
- 결과는 표로 출력하고 results/{모델}.json 에 저장한다 (git 무시). 리포트(docs/reports/T07-...)에 옮겨 적는다
"""

import argparse
import json
import mimetypes
import os
import sys
import time
from pathlib import Path

from app.ai.schema import ShapeScene
from app.ai.vision import AGY_MODEL, MODEL, VisionError, recognize, recognize_agy

HERE = Path(__file__).parent
FIELDS = ["shape", "size", "net", "labels", "marks", "lines"]
NAMES = {
    "shape": "도형",
    "size": "치수",
    "net": "전개도",
    "labels": "라벨",
    "marks": "면 표시",
    "lines": "선",
}
NET_TOL = 0.06  # grid 좌표는 전개도 전체 크기의 6% 까지 같다고 본다 (사진 원근·어림)


def _point(p: dict) -> tuple:
    """입체 선분 끝점을 비교하기 쉬운 꼴로: 꼭짓점 ("v", i), 모서리 위 점 ("e", 작은 번호, 큰 번호, 작은 번호에서의 비율)."""
    if "vertex" in p:
        return ("v", p["vertex"])
    (a, b), t = p["edge"], p["t"]
    if t < 1e-6:
        return ("v", a)
    if t > 1 - 1e-6:
        return ("v", b)
    return ("e", a, b, t) if a < b else ("e", b, a, 1 - t)


def _same_point(p: tuple, q: tuple, tol: float = 0.05) -> bool:
    if p[0] != q[0]:
        return False
    if p[0] == "v":
        return p == q
    # 비율은 0.05 까지 봐준다 (1/3 을 0.33 으로 쓰는 등)
    return p[1:3] == q[1:3] and abs(p[3] - q[3]) <= tol


def _same_line(l: dict, m: dict, same) -> bool:
    return (same(l["from"], m["from"]) and same(l["to"], m["to"])) or (
        same(l["from"], m["to"]) and same(l["to"], m["from"])
    )


def _match_all(want: list, got: list, same) -> bool:
    """정답마다 같은 것을 하나씩 지운다. 다 지워지고 남는 것도 없어야 맞음 (순서 상관없음)."""
    left = list(got)
    for w in want:
        hit = next((g for g in left if same(w, g)), None)
        if hit is None:
            return False
        left.remove(hit)
    return not left


def _normalized(net: dict):
    """grid 전개도를 평행이동·크기와 상관없이 비교하려고 왼쪽 위를 0, 전체 크기(긴 쪽)를 1 로 맞춘 좌표 함수."""
    xs = [f["x"] for f in net["faces"]] + [f["x"] + f["w"] for f in net["faces"]]
    ys = [f["y"] for f in net["faces"]] + [f["y"] + f["h"] for f in net["faces"]]
    x0, y0 = min(xs), min(ys)
    size = max(max(xs) - x0, max(ys) - y0)
    return lambda x, y: ((x - x0) / size, (y - y0) / size)


def _near(a: tuple, b: tuple) -> bool:
    return all(abs(p - q) <= NET_TOL for p, q in zip(a, b))


def compare(got: ShapeScene, want: ShapeScene) -> dict[str, bool]:
    """필드별로 맞았는지 (FIELDS).
    - 치수: 세 값을 정렬해서 1% 까지 (전개도만 보면 어느 면이 앞인지 정할 수 없어서 순서는 안 본다)
    - grid: 면 배치·라벨·선은 전개도를 맞춘 좌표로 6% 까지, 순서·방향 상관없음. 면 표시는 같은 자리 면의 글자·색칠
    - cross: 라벨은 꼭짓점 0~7 그대로, 선은 입체 선분 끝점으로"""
    g = got.model_dump(by_alias=True, mode="json")
    w = want.model_dump(by_alias=True, mode="json")
    shape = g["shape"] == w["shape"]
    size = shape and all(
        abs(a - b) <= 0.01 * b
        for a, b in zip(sorted(g["size"].values()), sorted(w["size"].values()))
    )
    layout = g["net"]["layout"] == w["net"]["layout"]
    if not layout or w["net"]["layout"] == "cross":
        return {
            "shape": shape,
            "size": size,
            "net": layout,
            "labels": layout and g["vertexLabels"] == w["vertexLabels"],
            "marks": layout,
            "lines": layout
            and _match_all(
                w["lines"],
                g["lines"],
                lambda l, m: _same_line(
                    l, m, lambda p, q: _same_point(_point(p), _point(q))
                ),
            ),
        }

    gn, wn = _normalized(g["net"]), _normalized(w["net"])

    def rect(n, f):
        x0, y0 = n(f["x"], f["y"])
        x1, y1 = n(f["x"] + f["w"], f["y"] + f["h"])
        return (x0, y0, x1, y1)

    def same_face(a, b):
        return _near(rect(wn, a), rect(gn, b))

    def same_mark(a, b):
        return (
            same_face(a, b)
            and (a.get("text") or "") == (b.get("text") or "")
            and bool(a.get("fill")) == bool(b.get("fill"))
        )

    def pt(n, p):
        return n(p["x"], p["y"])

    return {
        "shape": shape,
        "size": size,
        "net": _match_all(w["net"]["faces"], g["net"]["faces"], same_face),
        "labels": _match_all(
            w["net"]["cornerLabels"],
            g["net"]["cornerLabels"],
            lambda a, b: a["text"] == b["text"] and _near(pt(wn, a), pt(gn, b)),
        ),
        "marks": _match_all(w["net"]["faces"], g["net"]["faces"], same_mark),
        "lines": _match_all(
            w["net"]["lines"],
            g["net"]["lines"],
            lambda l, m: _same_line(l, m, lambda p, q: _near(pt(wn, p), pt(gn, q))),
        ),
    }


def _recognize_agy(image: bytes, content_type: str, model: str) -> ShapeScene:
    """팀 테스트 엔진 (worksheets.md W2): API 비용 없이 Antigravity CLI 로 같은 측정. 느려서 재시도하지 않는다."""
    os.environ["VISION_AGY_MODEL"] = model
    return recognize_agy(image, content_type)


def _recognize_retry(image: bytes, content_type: str, model: str) -> ShapeScene:
    """모델이 붐비거나(503 UNAVAILABLE) 시간이 넘으면(Timeout) 10초·30초 쉬고 다시 시도한다. 측정을 끝까지 하려고. (/analyze 의 재시도는 TODO-8 에서 정한다)"""
    for wait in (10, 30, None):
        try:
            return recognize(image, content_type, model)
        except VisionError as e:
            if wait is None or not ("UNAVAILABLE" in str(e) or "Timeout" in str(e)):
                raise
            time.sleep(wait)
    raise AssertionError("도달하지 않음")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model")
    parser.add_argument("--engine", choices=("api", "agy"), default="api")
    args = parser.parse_args()
    agy = args.engine == "agy"
    model = args.model or (AGY_MODEL if agy else MODEL)
    read = _recognize_agy if agy else _recognize_retry
    answers = json.loads((HERE / "answers.json").read_text(encoding="utf-8"))
    photos = sorted(
        p for p in (HERE / "photos").glob("*") if p.name in answers and p.is_file()
    )
    if not photos:
        sys.exit(
            "photos/ 에 정답(answers.json)이 있는 사진이 없다. 사진을 넣고 answers.json 에 정답을 적는다"
        )

    rows, saved = [], {}
    for photo in photos:
        answer = answers[photo.name]
        want = ShapeScene.model_validate(answer["scene"])
        skip = set(answer.get("skip", []))
        content_type = mimetypes.guess_type(photo.name)[0] or "image/jpeg"
        try:
            got = read(photo.read_bytes(), content_type, model)
        except VisionError as e:
            rows.append((photo.name, None, skip, str(e)[:80]))
            saved[photo.name] = {"error": str(e)}
            continue
        result = compare(got, want)
        rows.append((photo.name, result, skip, ""))
        saved[photo.name] = {
            "result": {f: (None if f in skip else result[f]) for f in FIELDS},
            "got": got.model_dump(by_alias=True, mode="json"),
        }

    mark = {True: "O", False: "X"}
    print(f"모델: {model}\n")
    print(f"| 사진 | {' | '.join(NAMES[f] for f in FIELDS)} | 오류 |")
    print("|---|" + "---|" * (len(FIELDS) + 1))
    for name, result, skip, error in rows:
        cells = ["-" if not result or f in skip else mark[result[f]] for f in FIELDS]
        print(f"| {name} | {' | '.join(cells)} | {error} |")
    scored = [(r, s) for _, r, s, _ in rows if r]
    print(
        f"\n{len(rows)}장 중 오류 {len(rows) - len(scored)}장. 맞은 수 / 채점한 수: "
        + ", ".join(
            f"{NAMES[f]} {sum(r[f] for r, s in scored if f not in s)}/{sum(f not in s for _, s in scored)}"
            for f in FIELDS
        )
    )
    (HERE / "results").mkdir(exist_ok=True)
    out = HERE / "results" / f"{model}.json"
    out.write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"저장: {out}")


if __name__ == "__main__":
    main()
