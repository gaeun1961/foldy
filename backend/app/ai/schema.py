"""ShapeScene: 공용 데이터 계약 (Pydantic).

frontend/src/shared/types.ts 와 항상 같은 구조를 유지한다. 바꾸려면 이슈로 먼저 합의하고 docs/specs/shape-scene.md 부터 고친다.
자세한 설명과 예시(꼭짓점 인덱스 규칙, 곡면 전개도 좌표): docs/specs/shape-scene.md

shape 에 따라 size, vertexLabels 길이, lines 끝점 형식, net 이 정해진다.
"""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, RootModel, model_validator

VERTEX_COUNT = {
    "cuboid": 8,
    "cube": 8,
    "regular-tetrahedron": 4,
    "regular-octahedron": 6,
    "regular-dodecahedron": 20,
    "regular-icosahedron": 12,
    # 각기둥·각뿔은 밑면 변 수에 따라 다르다 (_vertex_count)
    "cylinder": 0,
    "cone": 1,
    "sphere": 0,
    "revolution": 0,
}

Positive = Annotated[float, Field(gt=0)]
Ratio = Annotated[float, Field(ge=0, le=1)]
Angle = Annotated[float, Field(ge=0, le=720)]  # seam ~ seam + 360 (seam 은 0~360)


class BoxSize(BaseModel):
    width: Positive  # 가로 (x축)
    depth: Positive  # 깊이 (z축)
    height: Positive  # 높이 (y축)


class EdgeSize(BaseModel):
    edge: Positive  # 한 모서리 길이


class PolygonSize(BaseModel):
    sides: Annotated[int, Field(ge=3, le=12)]  # 밑면 정다각형의 변 수
    edge: Positive  # 밑면 한 변
    height: Positive


class RevolutionSize(BaseModel):
    figure: Literal[
        "rectangle", "right-triangle", "semicircle", "trapezoid"
    ]  # 돌리는 평면도형
    radius: Positive  # 바닥 쪽 가로 (반원은 반지름)
    height: Positive  # 높이 (반원은 쓰지 않음)
    top: Positive | None = None  # 사다리꼴 윗변
    gap: Annotated[float, Field(ge=0)] = 0  # 회전축에서 떨어진 거리


class SphereSize(BaseModel):
    radius: Positive


class RoundSize(BaseModel):
    radius: Positive  # 밑면 반지름
    height: Positive


# 다면체 선분 끝점
class VertexPoint(BaseModel):
    vertex: Annotated[int, Field(ge=0)]


class EdgePoint(BaseModel):
    edge: tuple[Annotated[int, Field(ge=0)], Annotated[int, Field(ge=0)]]
    t: Ratio  # edge[0] 에서 edge[1] 쪽으로 간 비율


PolyhedronPoint = VertexPoint | EdgePoint


# 원기둥 선분 끝점 (각도: 위에서 볼 때 앞 = 0°, 반시계)
class TopPoint(BaseModel):
    top: Angle


class BottomPoint(BaseModel):
    bottom: Angle


class CylinderSurface(BaseModel):
    angle: Angle
    h: Ratio  # 밑면 0 ~ 윗면 1


class CylinderSurfacePoint(BaseModel):
    surface: CylinderSurface


CylinderPoint = TopPoint | BottomPoint | CylinderSurfacePoint


# 원뿔 선분 끝점
class ApexPoint(BaseModel):
    apex: Literal[True]


class BasePoint(BaseModel):
    base: Angle


class ConeSurface(BaseModel):
    angle: Angle
    r: Ratio  # 꼭짓점 0 ~ 밑면 둘레 1


class ConeSurfacePoint(BaseModel):
    surface: ConeSurface


ConePoint = ApexPoint | BasePoint | ConeSurfacePoint


# 선분. 다면체: 두 끝점은 같은 면 위. 곡면 도형: 옆면 위, 전개도 위의 직선.
# Python 예약어 from 을 피하려고 alias 사용. JSON 키는 from / to
class _Line(BaseModel):
    model_config = {"populate_by_name": True, "serialize_by_alias": True}


class PolyhedronLine(_Line):
    from_: PolyhedronPoint = Field(alias="from")
    to: PolyhedronPoint


class CylinderLine(_Line):
    from_: CylinderPoint = Field(alias="from")
    to: CylinderPoint


class ConeLine(_Line):
    from_: ConePoint = Field(alias="from")
    to: ConePoint


class CrossNet(BaseModel):
    layout: Literal["cross"]


# 학습지 전개도 그대로 (docs/specs/shape-scene.md "전개도 grid"). 평면 좌표: x 오른쪽, y 아래, 단위는 size 와 같음
class NetPoint(BaseModel):
    x: float
    y: float


class NetFace(BaseModel):
    x: float  # 왼쪽 위
    y: float
    w: Positive
    h: Positive
    text: str | None = None  # 면에 쓴 글자·숫자
    fill: bool | None = None  # 색칠한 면


class CornerLabel(NetPoint):
    text: str  # 전개도 꼭짓점 라벨, 복사본마다


class NetLine(_Line):
    from_: NetPoint = Field(alias="from")
    to: NetPoint


class GridNet(BaseModel):
    layout: Literal["grid"]
    faces: Annotated[list[NetFace], Field(min_length=1)]
    cornerLabels: list[CornerLabel] = []
    lines: list[NetLine] = []  # 전개도 위 선. 끝점은 면의 변 위


class DefaultNet(BaseModel):
    layout: Literal["default"]


class CurvedNet(BaseModel):
    layout: Literal["default"]
    seam: Annotated[float, Field(ge=0, lt=360)] = 0  # 옆면을 자르는 각도


def _vertices(p) -> list[int]:
    if isinstance(p, VertexPoint):
        return [p.vertex]
    if isinstance(p, EdgePoint):
        return list(p.edge)
    return []


def _angles(p) -> list[float]:
    if isinstance(p, TopPoint):
        return [p.top]
    if isinstance(p, BottomPoint):
        return [p.bottom]
    if isinstance(p, BasePoint):
        return [p.base]
    if isinstance(p, (CylinderSurfacePoint, ConeSurfacePoint)):
        return [p.surface.angle]
    return []


def _vertex_count(scene) -> int:
    """vertexLabels 길이 (shape-scene.md 꼭짓점 수)."""
    if scene.shape == "prism":
        return 2 * scene.size.sides
    if scene.shape == "pyramid":
        return scene.size.sides + 1
    return VERTEX_COUNT[scene.shape]


class _Scene(BaseModel):
    vertexLabels: list[str | None]

    # 도형마다 다른 규칙: 라벨 개수, 꼭짓점 인덱스 범위, 곡면 각도 범위
    @model_validator(mode="after")
    def _check_by_shape(self) -> Self:
        n = _vertex_count(self)
        if len(self.vertexLabels) != n:
            raise ValueError(f"{self.shape} 의 vertexLabels 는 {n}개여야 한다")
        seam = getattr(self.net, "seam", 0)
        # grid 전개도의 꼭짓점 번호는 뷰어가 접어서 만든 번호라 0~7 을 넘을 수 있다 (잘못 그린 전개도)
        grid = getattr(self.net, "layout", None) == "grid"
        for line in self.lines:
            for p in (line.from_, line.to):
                if not grid and any(i >= n for i in _vertices(p)):
                    raise ValueError(f"{self.shape} 의 꼭짓점 인덱스는 0~{n - 1}")
                if any(not seam <= a <= seam + 360 for a in _angles(p)):
                    raise ValueError(f"각도는 seam({seam}) ~ seam + 360 사이")
        return self


class CuboidScene(_Scene):
    shape: Literal["cuboid"]
    size: BoxSize
    lines: list[PolyhedronLine]
    net: CrossNet | GridNet


class CubeScene(_Scene):
    shape: Literal["cube"]
    size: EdgeSize
    lines: list[PolyhedronLine]
    net: CrossNet | GridNet


class RegularPolyhedronScene(_Scene):
    shape: Literal[
        "regular-tetrahedron",
        "regular-octahedron",
        "regular-dodecahedron",
        "regular-icosahedron",
    ]
    size: EdgeSize
    lines: list[PolyhedronLine]
    net: DefaultNet


class PolygonSolidScene(_Scene):
    shape: Literal["prism", "pyramid"]  # 각기둥·각뿔 (밑면 정다각형)
    size: PolygonSize
    lines: list[PolyhedronLine]
    net: DefaultNet


class CylinderScene(_Scene):
    shape: Literal["cylinder"]
    size: RoundSize
    lines: list[CylinderLine]
    net: CurvedNet


class ConeScene(_Scene):
    shape: Literal["cone"]
    size: RoundSize
    lines: list[ConeLine]
    net: CurvedNet


class SphereScene(_Scene):
    shape: Literal["sphere"]  # 전개도가 없고 선도 없다
    size: SphereSize
    lines: Annotated[list[PolyhedronLine], Field(max_length=0)]
    net: DefaultNet


class RevolutionScene(_Scene):
    shape: Literal["revolution"]
    size: RevolutionSize
    lines: Annotated[list[PolyhedronLine], Field(max_length=0)]
    net: DefaultNet


class ShapeScene(RootModel):
    """shape 값으로 어느 형식인지 고른다. ShapeScene.model_validate(json) 으로 검증."""

    root: Annotated[
        CuboidScene
        | CubeScene
        | RegularPolyhedronScene
        | PolygonSolidScene
        | CylinderScene
        | ConeScene
        | SphereScene
        | RevolutionScene,
        Field(discriminator="shape"),
    ]
