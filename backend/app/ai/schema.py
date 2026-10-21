"""ShapeScene: 공용 데이터 계약 (Pydantic).

frontend/src/shared/types.ts 와 항상 같은 구조를 유지한다. 바꾸려면 이슈로 먼저 합의하고 docs/02-specs.md 부터 고친다.
자세한 설명과 예시(꼭짓점 인덱스 규칙, 곡면 전개도 좌표): docs/02-specs.md C

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
    "cylinder": 0,
    "cone": 1,
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


class _Scene(BaseModel):
    vertexLabels: list[str | None]

    # 도형마다 다른 규칙: 라벨 개수, 꼭짓점 인덱스 범위, 곡면 각도 범위
    @model_validator(mode="after")
    def _check_by_shape(self) -> Self:
        n = VERTEX_COUNT[self.shape]
        if len(self.vertexLabels) != n:
            raise ValueError(f"{self.shape} 의 vertexLabels 는 {n}개여야 한다")
        seam = getattr(self.net, "seam", 0)
        for line in self.lines:
            for p in (line.from_, line.to):
                if any(i >= n for i in _vertices(p)):
                    raise ValueError(f"{self.shape} 의 꼭짓점 인덱스는 0~{n - 1}")
                if any(not seam <= a <= seam + 360 for a in _angles(p)):
                    raise ValueError(f"각도는 seam({seam}) ~ seam + 360 사이")
        return self


class CuboidScene(_Scene):
    shape: Literal["cuboid"]
    size: BoxSize
    lines: list[PolyhedronLine]
    net: CrossNet


class CubeScene(_Scene):
    shape: Literal["cube"]
    size: EdgeSize
    lines: list[PolyhedronLine]
    net: CrossNet


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


class ShapeScene(RootModel):
    """shape 값으로 어느 형식인지 고른다. ShapeScene.model_validate(json) 으로 검증."""

    root: Annotated[
        CuboidScene | CubeScene | RegularPolyhedronScene | CylinderScene | ConeScene,
        Field(discriminator="shape"),
    ]
