"""ShapeScene 도형별 검증 확인. backend 폴더에서 `python -m tests.test_schema`."""

from pydantic import ValidationError

from app.ai.schema import ShapeScene
from app.ai.vision import MOCK_SCENE


def ok(data):
    return ShapeScene.model_validate(data).model_dump()


def bad(data):
    try:
        ShapeScene.model_validate(data)
    except ValidationError:
        return
    raise AssertionError(f"통과하면 안 됨: {data}")


CYLINDER = {
    "shape": "cylinder",
    "size": {"radius": 3, "height": 10},
    "vertexLabels": [],
    "lines": [{"from": {"bottom": 0}, "to": {"top": 360}}],
    "net": {"layout": "default", "seam": 0},
}
CONE = {
    "shape": "cone",
    "size": {"radius": 2, "height": 5},
    "vertexLabels": ["ㅇ"],
    "lines": [{"from": {"apex": True}, "to": {"surface": {"angle": 90, "r": 0.5}}}],
    "net": {"layout": "default"},
}
TETRA = {
    "shape": "regular-tetrahedron",
    "size": {"edge": 4},
    "vertexLabels": ["ㄱ", "ㄴ", "ㄷ", None],
    "lines": [{"from": {"vertex": 3}, "to": {"edge": [0, 1], "t": 0.5}}],
    "net": {"layout": "default"},
}

if __name__ == "__main__":
    # 정상: 목 데이터(직육면체), 정육면체, 정사면체, 원기둥(실 감기), 원뿔
    assert MOCK_SCENE.model_dump(by_alias=True)["lines"][0] == {
        "from": {"vertex": 0},
        "to": {"vertex": 5},
    }
    ok(
        {
            **TETRA,
            "shape": "cube",
            "size": {"edge": 2},
            "vertexLabels": [None] * 8,
            "net": {"layout": "cross"},
        }
    )
    ok(TETRA)
    assert ok(CYLINDER)["net"]["seam"] == 0
    assert ok(CONE)["net"]["seam"] == 0  # seam 생략 시 0
    ok(
        {
            **CYLINDER,
            "net": {"layout": "default", "seam": 90},
            "lines": [{"from": {"bottom": 90}, "to": {"top": 450}}],
        }
    )

    # 실패: 라벨 개수, 꼭짓점 범위, 도형에 안 맞는 size·끝점·net, 각도 범위
    bad({**TETRA, "vertexLabels": [None] * 8})
    bad({**TETRA, "lines": [{"from": {"vertex": 4}, "to": {"vertex": 0}}]})
    bad({**TETRA, "size": {"width": 1, "depth": 1, "height": 1}})
    bad({**CYLINDER, "lines": [{"from": {"vertex": 0}, "to": {"top": 10}}]})
    bad({**CYLINDER, "lines": [{"from": {"apex": True}, "to": {"top": 10}}]})
    bad({**CYLINDER, "lines": [{"from": {"bottom": 0}, "to": {"top": 400}}]})
    bad({**CYLINDER, "vertexLabels": ["ㄱ"]})
    bad({**CONE, "net": {"layout": "cross"}})
    bad({**CONE, "shape": "sphere"})
    print("ok")
