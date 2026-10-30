"""비전 정확도 비교(evals/vision_eval.compare) 검사. 실행: python -m tests.test_vision_eval

LLM 은 부르지 않는다. 정답과 인식 결과를 필드별로 맞게 비교하는지만 본다.
"""

from app.ai.schema import ShapeScene
from app.ai.vision import MOCK_SCENE
from evals.vision_eval import compare

want = MOCK_SCENE
base = want.model_dump(by_alias=True, mode="json")


def scene(**changes) -> ShapeScene:
    return ShapeScene.model_validate({**base, **changes})


ALL = {
    "shape": True,
    "size": True,
    "net": True,
    "labels": True,
    "marks": True,
    "lines": True,
}
assert compare(want, want) == ALL

# 선분은 순서·방향과 상관없고, 모서리 위 점은 [b, a], 1 - t 로 써도 같다. t 는 0.05 까지 봐준다
flipped = [
    {"from": {"edge": [7, 6], "t": 0.52}, "to": {"edge": [5, 4], "t": 0.5}},
    {"from": {"vertex": 5}, "to": {"vertex": 0}},
]
assert compare(scene(lines=flipped), want) == ALL
# t 가 0 이나 1 이면 꼭짓점과 같다
assert compare(
    scene(
        lines=[
            {"from": {"edge": [0, 1], "t": 0}, "to": {"edge": [1, 5], "t": 1}},
            base["lines"][1],
        ]
    ),
    want,
)["lines"]

# 틀린 경우
assert not compare(scene(lines=base["lines"][:1]), want)["lines"]  # 선분이 모자람
assert not compare(scene(lines=base["lines"] + base["lines"][:1]), want)[
    "lines"
]  # 선분이 남음
assert not compare(
    scene(lines=[{"from": {"vertex": 0}, "to": {"vertex": 7}}, base["lines"][1]]), want
)["lines"]
assert not compare(
    scene(vertexLabels=["ㄴ", "ㄱ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"]), want
)["labels"]
assert compare(scene(size={"width": 4.02, "depth": 2, "height": 3}), want)[
    "size"
]  # 1% 안
assert compare(scene(size={"width": 3, "depth": 2, "height": 4}), want)[
    "size"
]  # 세 값의 순서는 안 본다 (전개도만 보면 앞면을 정할 수 없음)
assert not compare(scene(size={"width": 4, "depth": 2, "height": 5}), want)["size"]
cube = compare(
    ShapeScene.model_validate({**base, "shape": "cube", "size": {"edge": 4}}), want
)
assert not cube["shape"] and not cube["size"]


# grid 전개도: 평행이동·크기와 상관없이, 전체 크기의 6% 까지 같다고 본다
GRID = {
    **base,
    "shape": "cube",
    "size": {"edge": 1},
    "vertexLabels": [None] * 8,
    "lines": [],
    "net": {
        "layout": "grid",
        "faces": [
            {"x": 1, "y": 0, "w": 1, "h": 1, "text": "1"},
            {"x": 0, "y": 1, "w": 1, "h": 1},
            {"x": 1, "y": 1, "w": 1, "h": 1, "fill": True},
            {"x": 2, "y": 1, "w": 1, "h": 1},
            {"x": 3, "y": 1, "w": 1, "h": 1},
            {"x": 1, "y": 2, "w": 1, "h": 1},
        ],
        "cornerLabels": [{"x": 1, "y": 0, "text": "ㄱ"}],
        "lines": [{"from": {"x": 1, "y": 0}, "to": {"x": 2, "y": 1}}],
    },
}
grid = ShapeScene.model_validate(GRID)


def moved(dx, dy, k, **changes):
    """GRID 전개도를 (dx, dy) 옮기고 k 배 한 것 (사진에서 단위·원점을 다르게 잡은 경우)."""
    net = GRID["net"]
    m = lambda p: {**p, "x": (p["x"] + dx) * k, "y": (p["y"] + dy) * k}
    out = {
        **net,
        "faces": [{**m(f), "w": f["w"] * k, "h": f["h"] * k} for f in net["faces"]],
        "cornerLabels": [m(c) for c in net["cornerLabels"]],
        "lines": [{"from": m(l["from"]), "to": m(l["to"])} for l in net["lines"]],
    }
    return ShapeScene.model_validate({**GRID, "net": {**out, **changes}})


assert compare(grid, grid) == ALL
assert compare(moved(5, 3, 2.5), grid) == ALL  # 옮기고 키워도 같음
flipped_line = [
    {"from": {"x": 2, "y": 1}, "to": {"x": 1.03, "y": 0}}
]  # 방향 반대, 조금 어긋남
assert compare(moved(0, 0, 1, lines=flipped_line), grid)["lines"]
assert not compare(moved(0, 0, 1, cornerLabels=[{"x": 2, "y": 0, "text": "ㄱ"}]), grid)[
    "labels"
]  # 라벨 자리가 다름
no_text = [{**f, "text": None} for f in GRID["net"]["faces"]]
r = compare(moved(0, 0, 1, faces=no_text), grid)
assert r["net"] and not r["marks"]  # 면 배치는 맞고 글자만 빠짐
assert not compare(moved(0, 0, 1, faces=GRID["net"]["faces"][:5]), grid)[
    "net"
]  # 면 하나 빠짐
assert not compare(
    ShapeScene.model_validate({**GRID, "net": {"layout": "cross"}}), grid
)["net"]  # cross 로 읽음

print(
    "ok: 비전 정확도 비교 (선분 순서·방향, 비율 오차, 치수 순서 무시, 라벨, grid 전개도 위치·크기 무시)"
)
