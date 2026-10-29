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


ALL = {"shape": True, "size": True, "labels": True, "lines": True}
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
assert not compare(scene(size={"width": 4, "depth": 3, "height": 2}), want)[
    "size"
]  # 깊이·높이를 바꿔 읽음
cube = compare(
    ShapeScene.model_validate({**base, "shape": "cube", "size": {"edge": 4}}), want
)
assert not cube["shape"] and not cube["size"]

print("ok: 비전 정확도 비교 (선분 순서·방향, 비율 오차, 치수 1%, 라벨)")
