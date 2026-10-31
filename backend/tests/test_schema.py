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
    # 구: 전개도·꼭짓점·선 없음
    SPHERE = {
        "shape": "sphere",
        "size": {"radius": 6},
        "vertexLabels": [],
        "lines": [],
        "net": {"layout": "default"},
    }
    assert ok(SPHERE)["size"]["radius"] == 6
    bad({**SPHERE, "vertexLabels": [None]})
    bad({**SPHERE, "lines": [{"from": {"vertex": 0}, "to": {"vertex": 0}}]})
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

    # 학습지 전개도 grid (직육면체·정육면체만, 이슈 #67)
    GRID = {
        "shape": "cube",
        "size": {"edge": 1},
        "vertexLabels": [None] * 8,
        "lines": [
            {"from": {"vertex": 9}, "to": {"vertex": 2}}
        ],  # 접어서 만든 번호는 8 이상도 된다
        "net": {
            "layout": "grid",
            "faces": [{"x": 0, "y": 0, "w": 1, "h": 1, "text": "가", "fill": True}],
            "cornerLabels": [{"x": 0, "y": 0, "text": "ㄱ"}],
            "lines": [{"from": {"x": 0, "y": 0}, "to": {"x": 1, "y": 1}}],
        },
    }
    assert ok(GRID)["net"]["lines"][0]["from"] == {"x": 0, "y": 0}
    ok({**GRID, "net": {"layout": "grid", "faces": GRID["net"]["faces"]}})
    bad({**GRID, "net": {"layout": "grid", "faces": []}})  # 면이 하나도 없음
    bad(
        {
            **GRID,
            "lines": [{"from": {"vertex": 9}, "to": {"vertex": 2}}],
            "net": {"layout": "cross"},
        }
    )
    bad({**TETRA, "net": GRID["net"]})  # 정다면체는 grid 없음

    # 각기둥·각뿔: 라벨 개수는 밑면 변 수로 (오각기둥 10, 사각뿔 5), 변 수는 정수 3~12
    PRISM = {
        "shape": "prism",
        "size": {"sides": 5, "edge": 2, "height": 4},
        "vertexLabels": [None] * 10,
        "lines": [{"from": {"vertex": 9}, "to": {"edge": [0, 1], "t": 0.5}}],
        "net": {"layout": "default"},
    }
    PYRAMID = {
        **PRISM,
        "shape": "pyramid",
        "size": {"sides": 4, "edge": 3, "height": 5},
        "vertexLabels": [None] * 5,
        "lines": [{"from": {"vertex": 4}, "to": {"vertex": 0}}],
    }
    ok(PRISM)
    ok(PYRAMID)

    # 문제 글·사진 속 전개도 네모 (선택 항목, shape-scene.md)
    PHOTO = {
        **GRID,
        "problem": "㉠, ㉡, ㉢에 알맞은 수를 구하세요.",
        "photoBox": {"x": 0.2, "y": 0.1, "w": 0.5, "h": 0.4},
    }
    assert ok(PHOTO)["problem"].startswith("㉠")
    ok({**GRID, "problem": None, "photoBox": None})
    bad({**PHOTO, "photoBox": {"x": 0.2, "y": 0.1, "w": 0, "h": 0.4}})
    bad({**PHOTO, "photoBox": {"x": -0.1, "y": 0.1, "w": 0.5, "h": 0.4}})
    bad({**PHOTO, "photoBox": {"x": 0.2, "y": 0.1, "w": 1.5, "h": 0.4}})
    bad({**PRISM, "vertexLabels": [None] * 8})
    bad({**PYRAMID, "lines": [{"from": {"vertex": 5}, "to": {"vertex": 0}}]})
    bad({**PRISM, "size": {"sides": 2, "edge": 2, "height": 4}})
    bad({**PRISM, "size": {"sides": 4.5, "edge": 2, "height": 4}})
    bad({**PRISM, "size": {"edge": 2}})
    print("ok")
