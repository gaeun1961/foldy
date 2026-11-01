"""R13/R14/R15 문제 단위 개발 사례. 사진은 저장소 밖에만 저장한다."""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

BASE = Path("D:/_개발/foldy-bench-tools/eval-20261101")
OUT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50/batches/a")
INV = {
    r["id"]: r for r in json.loads((BASE / "inventory.json").read_text(encoding="utf8"))
}
# id, source, page, question, problem box, designated shape box, kind, shape, title, dimensions, note
SPECS = [
    (
        "A01",
        "P23",
        "R13 p001",
        "01",
        (0.105, 0.165, 0.49, 0.335),
        (0.245, 0.22, 0.39, 0.29),
        "solid",
        "cuboid",
        "직사각형6개로 둘러싸인 직육면체",
        None,
        "치수 미기재. 정규화 예시 크기2×1×1.",
    ),
    (
        "A02",
        "P23",
        "R13 p001",
        "06",
        (0.515, 0.66, 0.95, 0.84),
        (0.66, 0.71, 0.79, 0.80),
        "solid",
        "cuboid",
        "색칠한 면과 평행한 면 찾기",
        None,
        "오른쪽 보이는 면 초록색. 단순 형상과 색칠 의미 보존을 별도 판단.",
    ),
    (
        "A03",
        "P24",
        "R13 p002",
        "09",
        (0.515, 0.10, 0.95, 0.30),
        (0.62, 0.17, 0.84, 0.28),
        "net",
        "cube",
        "색칠한 면과 평행한 면 전개도",
        None,
        "정규화 한변1. 위쪽 붙은 면만 보라색. 답을 미리 색칠하지 않음.",
    ),
    (
        "A04",
        "P24",
        "R13 p002",
        "10",
        (0.515, 0.515, 0.95, 0.72),
        (0.65, 0.57, 0.92, 0.70),
        "net",
        "cuboid",
        "3×6×5 직육면체 전개도 빈 치수",
        [3, 6, 5],
        "입체3·6·5치수는 문제 전체에 있음. 지정 대상은 오른쪽 전개도이며 빈칸 답을 생성하지 않음.",
    ),
    (
        "A05",
        "P25",
        "R13 p003",
        "11",
        (0.105, 0.10, 0.49, 0.28),
        (0.265, 0.175, 0.375, 0.25),
        "solid",
        "cube",
        "보이지 않는 면과 꼭짓점 수",
        None,
        "문장에 정육면체 명시. 치수미상 한변1.",
    ),
    (
        "A06",
        "P25",
        "R13 p003",
        "13",
        (0.515, 0.10, 0.95, 0.33),
        (0.62, 0.12, 0.785, 0.205),
        "solid",
        "cuboid",
        "꼭짓점 한글 라벨 직육면체 평행면",
        None,
        "13·14는 같은 그림이므로13만 한문제로 계수. 라벨은 원본 보존.",
    ),
    (
        "A07",
        "P25",
        "R13 p003",
        "15",
        (0.515, 0.61, 0.95, 0.82),
        (0.69, 0.69, 0.88, 0.81),
        "net",
        "cuboid",
        "꼭짓점 빈칸 직육면체 전개도",
        None,
        "지정 대상 오른쪽 전개도. 빈 답안칸을 라벨로 추정하여 채우지 않음.",
    ),
    (
        "A08",
        "P28",
        "R14 p002",
        "06",
        (0.105, 0.10, 0.49, 0.31),
        (0.41, 0.105, 0.48, 0.17),
        "solid",
        "cuboid",
        "밑면 색칠된 직육면체와 선택지",
        None,
        "지정 대상은 문장 옆 기준 입체1개. 아래3선택지를 별도 사례로 세지 않음. 밑면 파랑.",
    ),
    (
        "A09",
        "P28",
        "R14 p002",
        "07",
        (0.105, 0.525, 0.49, 0.68),
        (0.255, 0.58, 0.375, 0.65),
        "solid",
        "cuboid",
        "색칠한 면과 수직인 면 개수",
        None,
        "문장 직육면체. 오른쪽면 파랑. 정확 치수 미상, 정육면체라고 단정하지 않음.",
    ),
    (
        "A10",
        "P29",
        "R14 p003",
        "14",
        (0.515, 0.10, 0.95, 0.295),
        (0.685, 0.175, 0.895, 0.285),
        "net",
        "cube",
        "꼭짓점 빈칸 정육면체 전개도",
        None,
        "왼쪽 입체와 오른쪽 전개도 중 오른쪽이 지정 대상. 한변1정규화.",
    ),
    (
        "A11",
        "P29",
        "R14 p003",
        "15",
        (0.515, 0.30, 0.95, 0.59),
        (0.75, 0.35, 0.90, 0.45),
        "solid",
        "cuboid",
        "2×3×3 직육면체의 전개도 그리기",
        [2, 3, 3],
        "빈 모눈칸은 도형이 아님. 지정 대상은 치수 있는 오른쪽 입체.",
    ),
    (
        "A12",
        "P33",
        "R15 p003",
        "13",
        (0.105, 0.34, 0.49, 0.535),
        (0.225, 0.415, 0.415, 0.52),
        "net",
        "cube",
        "계단형 전개도 마주보는 면 색칠",
        None,
        "모서리 치수 미상. 원본은 색칠되지 않았으므로 정답 색칠을 추가하지 않음.",
    ),
    (
        "A13",
        "P33",
        "R15 p003",
        "16",
        (0.515, 0.54, 0.95, 0.73),
        (0.67, 0.62, 0.79, 0.71),
        "solid",
        "cube",
        "눈3면과 수직인 면의 눈의 합",
        None,
        "보이는 주사위 눈은 위3·왼쪽1·오른쪽2. 현재 solid계약은 면숫자 직접표시 불가: 형상과 학습내용 보존 구분.",
    ),
]
NETS = {
    "A03": [
        [1, 0, 1, 1],
        [0, 1, 1, 1],
        [1, 1, 1, 1],
        [2, 1, 1, 1],
        [3, 1, 1, 1],
        [3, 2, 1, 1],
    ],
    "A04": [
        [3, 0, 6, 3],
        [0, 3, 3, 5],
        [3, 3, 6, 5],
        [9, 3, 3, 5],
        [12, 3, 6, 5],
        [3, 8, 6, 3],
    ],
    "A07": [
        [1, 0, 1, 1],
        [0, 1, 1, 2],
        [1, 1, 1, 2],
        [2, 1, 1, 2],
        [3, 1, 1, 2],
        [1, 3, 1, 1],
    ],
    "A10": [
        [0, 0, 1, 1],
        [0, 1, 1, 1],
        [1, 1, 1, 1],
        [2, 1, 1, 1],
        [3, 1, 1, 1],
        [1, 2, 1, 1],
    ],
    "A12": [
        [2, 0, 1, 1],
        [3, 0, 1, 1],
        [1, 1, 1, 1],
        [2, 1, 1, 1],
        [0, 2, 1, 1],
        [1, 2, 1, 1],
    ],
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    labels = []
    for ident, src, page, q, crop, sbox, kind, shape, title, dims, note in SPECS:
        source = Path(INV[src]["path"])
        im = Image.open(source).convert("RGB")
        w, h = im.size
        prob = im.crop(
            tuple(round(v * (w if i % 2 == 0 else h)) for i, v in enumerate(crop))
        )
        prob.thumbnail((1600, 1600))
        prob.save(OUT / f"{ident}-problem.jpg", quality=94)
        box = [
            (sbox[i] - crop[i % 2]) / (crop[i % 2 + 2] - crop[i % 2]) for i in range(4)
        ]
        pw, ph = prob.size
        sim = prob.crop(
            tuple(round(v * (pw if i % 2 == 0 else ph)) for i, v in enumerate(box))
        )
        sim.save(OUT / f"{ident}-shape.jpg", quality=94)
        row = {
            "id": ident,
            "source": src,
            "source_path": str(source),
            "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "page": page,
            "question": q,
            "problem_group": page + "-q" + q,
            "rotation": 0,
            "crop": crop,
            "expected_box": box,
            "kind": kind,
            "expected_shape": shape,
            "title": title,
            "problem": str(OUT / f"{ident}-problem.jpg"),
            "shape": str(OUT / f"{ident}-shape.jpg"),
            "split": "demo_development",
            "annotation": "agent_visual_review_not_human_approved",
            "designated_target_note": note,
        }
        rows.append(row)
        size = (
            {"edge": 1}
            if shape == "cube"
            else dict(zip(["width", "depth", "height"], dims or [2, 1, 1]))
        )
        if ident == "A07":
            size = {"width": 1, "depth": 1, "height": 2}
        vertex = [None] * 8
        if ident == "A06":
            vertex = ["ㅂ", "ㅅ", "ㅇ", "ㅁ", "ㄴ", "ㄷ", "ㄹ", "ㄱ"]
        net = {"layout": "cross"}
        if ident in NETS:
            net = {
                "layout": "grid",
                "faces": [dict(zip(["x", "y", "w", "h"], v)) for v in NETS[ident]],
                "cornerLabels": [],
                "lines": [],
            }
            if ident == "A03":
                net["faces"][0]["fill"] = True
            if ident in ["A04", "A07", "A10"]:
                for face in net["faces"]:
                    face["fill"] = True
            corners = {
                "A07": [
                    (1, 0, "ㄱ"),
                    (2, 0, "ㄹ"),
                    (1, 1, "ㄴ"),
                    (2, 1, "ㄷ"),
                    (3, 1, "ㄹ"),
                    (1, 3, "ㅂ"),
                    (2, 3, "ㅅ"),
                    (4, 3, "ㅁ"),
                    (1, 4, "ㅁ"),
                    (2, 4, "ㅇ"),
                ],
                "A10": [
                    (0, 0, "ㅇ"),
                    (1, 0, "ㄹ"),
                    (0, 1, "ㅁ"),
                    (1, 1, "ㄱ"),
                    (2, 1, "ㄹ"),
                    (0, 2, "ㅂ"),
                    (1, 2, "ㄴ"),
                    (2, 2, "ㄷ"),
                    (1, 3, "ㅂ"),
                    (2, 3, "ㅅ"),
                ],
            }
            net["cornerLabels"] = [
                {"x": x, "y": y, "text": t} for x, y, t in corners.get(ident, [])
            ]
        scene = {
            "shape": shape,
            "size": size,
            "vertexLabels": vertex,
            "lines": [],
            "net": net,
        }
        incomplete = ident in ["A02", "A08", "A09", "A13"]
        label = {
            "id": ident,
            "kind": kind,
            "expected_shape": shape,
            "dimensions_printed": dims,
            "dimension_source": "printed" if dims else "normalized_assumption",
            "support": "geometry_supported_content_partial"
            if incomplete
            else "current_contract_candidate",
            "net_rectangles": NETS.get(ident),
            "labels": vertex if ident == "A06" else [],
            "normalization_assumption": None
            if dims
            else "실제 치수 미기재. scene_candidate 크기는 예시 가정이며 원본 실제값이 아님.",
            "scene_candidate": scene,
            "scene_candidate_status": "partial_do_not_treat_as_final"
            if incomplete
            else "agent_visual_candidate_requires_schema_and_render_check",
            "annotation": "agent_visual_review_not_human_approved",
            "reason": note,
        }
        label["review_status"] = "agent_visual_review_complete_not_human_approved"
        label["approved_for_prompt"] = not incomplete
        label["assumptions"] = (
            []
            if dims
            else [
                "정규화 치수는 실제 크기가 아님",
                "정규화 가정은 사용자에게 표시해야 함",
            ]
        )
        if ident in ["A07", "A10"]:
            label["labels"] = net["cornerLabels"]
        labels.append(label)
    (OUT / "cases.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf8"
    )
    (OUT / "labels.json").write_text(
        json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf8"
    )
    sheet = Image.new("RGB", (1600, 2000), "#ddd")
    d = ImageDraw.Draw(sheet)
    for j, r in enumerate(rows):
        im = Image.open(r["problem"])
        im.thumbnail((390, 450))
        x = j % 4 * 400
        y = j // 4 * 500
        sheet.paste(im, (x, y + 28))
        d.text((x + 5, y + 5), r["id"] + " " + r["kind"], fill="black")
    sheet.save(OUT / "contact.jpg")
    print("prepared", len(rows))


if __name__ == "__main__":
    main()
