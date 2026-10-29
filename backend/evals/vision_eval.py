"""비전 LLM 정확도 측정 (TODO-7). 실행: backend 폴더에서 python -m evals.vision_eval [--model 모델이름]

photos/ 의 학습지 사진마다 vision.recognize 를 불러 answers.json 의 정답 ShapeScene 과 비교한다.
- 사진은 저작권 때문에 git 에 올리지 않는다 (photos/ 는 .gitignore)
- answers.json: {"사진 파일 이름": 정답 ShapeScene, ...}. 정답이 없는 사진은 건너뛴다
- 결과는 표로 출력하고 results/{모델}.json 에 저장한다 (git 무시). 리포트(docs/reports/T07-...)에 옮겨 적는다
"""

import argparse
import json
import mimetypes
import sys
from pathlib import Path

from app.ai.schema import ShapeScene
from app.ai.vision import MODEL, VisionError, recognize

HERE = Path(__file__).parent
FIELDS = ["shape", "size", "labels", "lines"]


def _point(p: dict) -> tuple:
    """선분 끝점을 비교하기 쉬운 꼴로: 꼭짓점 ("v", i), 모서리 위 점 ("e", 작은 번호, 큰 번호, 작은 번호에서의 비율)."""
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
    return (
        p[1:3] == q[1:3] and abs(p[3] - q[3]) <= tol
    )  # 비율은 0.05 까지 봐준다 (1/3 을 0.33 으로 쓰는 등)


def _same_line(l: dict, m: dict) -> bool:
    a, b = _point(l["from"]), _point(l["to"])
    c, d = _point(m["from"]), _point(m["to"])
    return (_same_point(a, c) and _same_point(b, d)) or (
        _same_point(a, d) and _same_point(b, c)
    )


def compare(got: ShapeScene, want: ShapeScene) -> dict[str, bool]:
    """필드별로 맞았는지. 치수는 1% 까지, 선분은 순서·방향과 상관없이 같은 선분이 같은 개수만큼 있으면 맞음."""
    g = got.model_dump(by_alias=True, mode="json")
    w = want.model_dump(by_alias=True, mode="json")
    shape = g["shape"] == w["shape"]
    size = shape and all(
        abs(g["size"][k] - v) <= 0.01 * v for k, v in w["size"].items()
    )
    unmatched = list(
        g["lines"]
    )  # 정답 선분마다 같은 선분을 하나씩 지운다. 다 지워지고 남는 것도 없어야 맞음
    lines = True
    for line in w["lines"]:
        hit = next((m for m in unmatched if _same_line(line, m)), None)
        if hit is None:
            lines = False
            break
        unmatched.remove(hit)
    lines = lines and not unmatched
    return {
        "shape": shape,
        "size": size,
        "labels": g["vertexLabels"] == w["vertexLabels"],
        "lines": lines,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=MODEL)
    model = parser.parse_args().model
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
        want = ShapeScene.model_validate(answers[photo.name])
        content_type = mimetypes.guess_type(photo.name)[0] or "image/jpeg"
        try:
            got = recognize(photo.read_bytes(), content_type, model)
        except VisionError as e:
            rows.append((photo.name, None, str(e)[:80]))
            saved[photo.name] = {"error": str(e)}
            continue
        result = compare(got, want)
        rows.append((photo.name, result, ""))
        saved[photo.name] = {
            "result": result,
            "got": got.model_dump(by_alias=True, mode="json"),
        }

    mark = {True: "O", False: "X"}
    print(f"모델: {model}\n")
    print("| 사진 | 도형 | 치수 | 라벨 | 선분 | 오류 |")
    print("|---|---|---|---|---|---|")
    for name, result, error in rows:
        cells = [mark[result[f]] for f in FIELDS] if result else ["-"] * 4
        print(f"| {name} | {' | '.join(cells)} | {error} |")
    ok = [r for _, r, _ in rows if r]
    print(
        f"\n{len(rows)}장 중 오류 {len(rows) - len(ok)}장. 맞은 수: "
        + ", ".join(f"{f} {sum(r[f] for r in ok)}" for f in FIELDS)
    )
    (HERE / "results").mkdir(exist_ok=True)
    out = HERE / "results" / f"{model}.json"
    out.write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"저장: {out}")


if __name__ == "__main__":
    main()
