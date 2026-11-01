"""R12의 문제 단위 후보 13개를 재현한다. 사진은 외부 폴더에만 쓴다."""

import hashlib
import json
from pathlib import Path

import pymupdf

SOURCE = Path(
    "D:/가천대학교/26-2/해커톤/_테스트 학습지/국내학습지_우선검토/원본/R12_인천교육청_수학학습자료.pdf"
)
OUT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50/batches/b")

# 좌표는 596x766 미리보기 좌표. 같은 주문제 안 소문항을 별도 후보로 세지 않는다.
SPECS = [
    (
        52,
        "1",
        "각기둥 찾기: 보기 나",
        (54, 108, 511, 713),
        (265, 294, 337, 374),
        "solid",
        "cuboid",
        {"width": 1, "depth": 1, "height": 2},
        "normalized",
        "직사각형 면과 평행한 모서리의 상자. 치수 없음.",
        None,
    ),
    (
        53,
        "2",
        "각기둥 찾기: 보기 마 원기둥",
        (65, 76, 536, 219),
        (400, 115, 461, 179),
        "solid",
        "cylinder",
        {"radius": 1, "height": 1},
        "normalized",
        "위아래 원형 면과 곡면 옆면. 선택지 전체는 한 문제로 계산.",
        None,
    ),
    (
        54,
        "4",
        "각기둥 옆면 찾기: 위쪽 표 오각기둥",
        (55, 67, 513, 709),
        (79, 388, 194, 525),
        "solid",
        "prism",
        {"sides": 5},
        "unknown",
        "오각형 밑면의 기둥과 한글 꼭짓점. 정오각형은 보장되지 않음.",
        "일반 오각형 밑면과 꼭짓점 배치를 정각기둥 템플릿으로 확정할 수 없음",
    ),
    (
        55,
        "5",
        "밑면과 옆면: 첫 삼각기둥",
        (64, 70, 516, 702),
        (85, 150, 208, 239),
        "solid",
        "prism",
        {"sides": 3},
        "unknown",
        "첫 행 삼각기둥의 ㄱ~ㅂ 라벨. 세 변 동일 조건은 없음.",
        "밑면이 정삼각형이라는 조건이 없어 정삼각기둥으로 대체하지 않음",
    ),
    (
        57,
        "2",
        "구성 요소: 첫 줄 가운데 사각기둥",
        (65, 76, 515, 711),
        (277, 341, 338, 429),
        "solid",
        "cuboid",
        {"width": 1, "depth": 1, "height": 2},
        "normalized",
        "첫 줄 가운데 그림의 직사각형 기둥. 치수 없음.",
        None,
    ),
    (
        61,
        "2",
        "전개도로 이름 찾기: 소문항⑤",
        (65, 77, 514, 716),
        (129, 398, 256, 496),
        "net",
        "cube",
        {"edge": 1},
        "normalized",
        "소문항⑤는 같은 정사각형 여섯 개. 같은 주문제의 다른 7개 선택 전개도는 별도 계산하지 않음.",
        None,
    ),
    (
        65,
        "2",
        "각뿔 찾기: 보기 나",
        (65, 76, 535, 217),
        (164, 113, 229, 184),
        "solid",
        "pyramid",
        {"sides": 4},
        "unknown",
        "꼭대기 한 점과 사각형 밑면. 정사각형·정각뿔 높이는 원문에 없음.",
        "정사각형 밑면 및 수직 중심 꼭짓점 조건 불명확",
    ),
    (
        67,
        "5",
        "밑면과 옆면: 아래쪽 오각뿔",
        (64, 70, 516, 706),
        (85, 545, 211, 654),
        "solid",
        "pyramid",
        {"sides": 5},
        "unknown",
        "옆으로 놓인 오각뿔과 한글 라벨. 평면 전개도가 아님.",
        "정오각형 밑면 및 정각뿔 중심조건 불명확; 라벨 위치 보존 필요",
    ),
    (
        172,
        "1",
        "5×4×6 직육면체 겉넓이 전개도",
        (54, 406, 510, 703),
        (279, 429, 429, 539),
        "net",
        "cuboid",
        {"width": 5, "depth": 4, "height": 6},
        "printed",
        "인쇄된5cm·4cm·6cm와 여섯 면의 원형 숫자①~⑥. 위아래 면은 가로줄 세 번째에 부착.",
        None,
    ),
    (
        173,
        "2",
        "8cm 정육면체 계단형 전개도",
        (65, 393, 513, 697),
        (277, 432, 440, 560),
        "net",
        "cube",
        {"edge": 8},
        "printed",
        "문맥 입체의 모든 모서리8cm. 전개도는 위 두 칸, 가운데 오른쪽 세 칸, 오른쪽 아래 한 칸.",
        None,
    ),
    (
        174,
        "3",
        "10×3×8 직육면체 겉넓이",
        (54, 77, 520, 712),
        (109, 145, 224, 262),
        "solid",
        "cuboid",
        {"width": 10, "depth": 3, "height": 8},
        "printed",
        "왼쪽 입체의 가로10cm, 깊이3cm, 높이8cm. 오른쪽 전개도와 같은 문제 한 건.",
        None,
    ),
    (
        175,
        "4",
        "정육면체 겉넓이: 첫2cm",
        (65, 77, 516, 699),
        (99, 127, 287, 285),
        "solid",
        "cube",
        {"edge": 2},
        "printed",
        "첫 번째 정육면체의2cm. 같은 주문제4의4cm·6cm 도형은 추가 건수로 세지 않음.",
        None,
    ),
    (
        176,
        "1",
        "직육면체와 정육면체 겉넓이: 첫6×5×5",
        (55, 136, 517, 704),
        (98, 183, 286, 386),
        "solid",
        "cuboid",
        {"width": 6, "depth": 5, "height": 5},
        "printed",
        "첫 도형 가로6cm, 깊이5cm, 높이5cm로 정육면체가 아님.",
        None,
    ),
]


def face(x, y, w, h, text=None, fill=None):
    f = {"x": x, "y": y, "w": w, "h": h}
    if text is not None:
        f["text"] = text
    if fill is not None:
        f["fill"] = fill
    return f


def scene_for(index, shape, dimensions, blocked):
    if blocked:
        return None
    scene = {
        "shape": shape,
        "size": dimensions,
        "vertexLabels": [] if shape == "cylinder" else [None] * 8,
        "lines": [],
        "net": {"layout": "default" if shape == "cylinder" else "cross"},
    }
    if index == 6:
        scene["net"] = {
            "layout": "grid",
            "faces": [
                face(x, y, 1, 1)
                for x, y in [(0, 0), (0, 1), (1, 1), (2, 1), (3, 1), (0, 2)]
            ],
            "cornerLabels": [],
            "lines": [],
        }
    if index == 9:
        scene["net"] = {
            "layout": "grid",
            "faces": [
                face(9, 0, 5, 4, "①", True),
                face(0, 4, 5, 6, "②", True),
                face(5, 4, 4, 6, "③", True),
                face(9, 4, 5, 6, "④", True),
                face(14, 4, 4, 6, "⑤", True),
                face(9, 10, 5, 4, "⑥", True),
            ],
            "cornerLabels": [],
            "lines": [],
        }
    if index == 10:
        scene["net"] = {
            "layout": "grid",
            "faces": [
                face(8 * x, 8 * y, 8, 8, fill=True)
                for x, y in [(0, 0), (1, 0), (1, 1), (2, 1), (3, 1), (3, 2)]
            ],
            "cornerLabels": [],
            "lines": [],
        }
    return scene


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    images = OUT / "images"
    images.mkdir(exist_ok=True)
    doc = pymupdf.open(SOURCE)
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    cases = []
    labels = []
    for i, (
        page,
        number,
        title,
        pbox,
        sbox,
        kind,
        shape,
        dims,
        origin,
        observation,
        blocked,
    ) in enumerate(SPECS, 1):
        ident = f"B{i:02d}"
        paths = {}
        for suffix, box in [("problem", pbox), ("shape", sbox)]:
            rect = pymupdf.Rect(
                box[0] * doc[page - 1].rect.width / 596,
                box[1] * doc[page - 1].rect.height / 766,
                box[2] * doc[page - 1].rect.width / 596,
                box[3] * doc[page - 1].rect.height / 766,
            )
            dest = images / f"{ident}-{suffix}.png"
            doc[page - 1].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=rect).save(dest)
            paths[suffix] = str(dest)
        key = f"{source_hash}:page={page}:problem={number}"
        cases.append(
            {
                "id": ident,
                "source": "R12",
                "source_path": str(SOURCE),
                "source_hash": source_hash,
                "source_sha256": source_hash,
                "pdf_page": page,
                "page_numbering": "1-based PDF page = printed page",
                "problem_number": number,
                "dedup_key": key,
                "item_type": "problem",
                "title": title,
                "kind": kind,
                "expected_shape": shape,
                "split": "demo_development",
                "problem_crop_preview_pixels": pbox,
                "shape_crop_preview_pixels": sbox,
                **paths,
            }
        )
        assumptions = []
        if origin == "normalized":
            assumptions.append(
                "실제치수와 원본비례 미상; 수치는 같은 종류를 그리기 위한 표현용 정규화 가정"
            )
        if blocked:
            assumptions.append(blocked)
        candidate = scene_for(i, shape, dims, blocked)
        labels.append(
            {
                "id": ident,
                "kind": kind,
                "expected_shape": shape,
                "dimensions": dims,
                "dimension_source": origin,
                "assumptions": assumptions,
                "observation": observation,
                "scene_candidate": candidate,
                "support_status": "review_required"
                if blocked
                else "representable_normalized"
                if origin == "normalized"
                else "representable",
                "needs_review": bool(blocked),
                "review_status": "teacher_visual_reviewed_not_human_approved",
                "reviewer": {"model": "gpt-6-astra", "effort": "low"},
                "approved_for_prompt": not bool(blocked),
                "render_verified": False,
                "reason": blocked
                or "원본의 선택 도형과 치수/정규화 가정을 시각 대조함",
            }
        )
    assert len({c["dedup_key"] for c in cases}) == len(cases) == 13
    assert not any(c["pdf_page"] in [56, 60, 62, 64, 68, 177] for c in cases)
    for name, value in [("cases.json", cases), ("labels.json", labels)]:
        (OUT / name).write_text(
            json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    print(
        json.dumps(
            {
                "cases": len(cases),
                "approved_for_prompt": sum(x["approved_for_prompt"] for x in labels),
                "output": str(OUT),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
