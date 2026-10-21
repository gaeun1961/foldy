"""ShapeScene: 공용 데이터 계약 (Pydantic).

frontend/src/shared/types.ts 와 항상 같은 구조를 유지한다. 바꾸려면 이슈로 먼저 합의하고 docs/02-specs.md 부터 고친다.
자세한 설명과 예시: docs/02-specs.md

꼭짓점 인덱스 규칙 (도형 중심이 원점, 앞쪽 = 보는 사람 쪽)

      7 ------- 6        아랫면: 0 앞왼쪽, 1 앞오른쪽, 2 뒤오른쪽, 3 뒤왼쪽
     /|        /|        윗면:   4~7 은 각각 0~3 바로 위
    4 ------- 5 |
    | 3 ------|- 2
    |/        |/
    0 ------- 1
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

VertexIndex = Annotated[int, Field(ge=0, le=7)]


class Size(BaseModel):
    width: float = Field(gt=0)  # 가로 (x축)
    depth: float = Field(gt=0)  # 세로/깊이 (z축)
    height: float = Field(gt=0)  # 높이 (y축)


class VertexPoint(BaseModel):
    vertex: VertexIndex


class EdgePoint(BaseModel):
    edge: tuple[VertexIndex, VertexIndex]
    t: float = Field(ge=0, le=1)  # edge[0] 에서 edge[1] 쪽으로 간 비율


LinePoint = VertexPoint | EdgePoint


class FaceLine(BaseModel):
    """면 위의 선분. 두 끝점은 같은 면 위에 있어야 한다."""

    # Python 예약어 from 을 피하려고 alias 사용. JSON 키는 from / to
    from_: LinePoint = Field(alias="from")
    to: LinePoint

    model_config = {"populate_by_name": True, "serialize_by_alias": True}


class Net(BaseModel):
    layout: Literal["cross"]  # 1차는 십자형 기본 전개도만


class ShapeScene(BaseModel):
    shape: Literal["cuboid", "cube"]
    size: Size
    vertexLabels: list[str | None] = Field(min_length=8, max_length=8)
    lines: list[FaceLine]
    net: Net
