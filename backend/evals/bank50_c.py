"""고유 문제 수 보강용 C 배치. A 배치 준비 함수를 재사용한다."""

import json
from pathlib import Path

import bank50_a as prep

prep.OUT = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50/batches/c")
prep.NETS = {}
prep.SPECS = [
    (
        "C01",
        "P31",
        "R15 p001",
        "03",
        (0.515, 0.165, 0.95, 0.375),
        (0.625, 0.215, 0.84, 0.295),
        "solid",
        "cuboid",
        "9×7×3 직육면체의 미지 모서리",
        [9, 7, 3],
        "인쇄 수치9·7·3cm로 입체 재현. ㄱ·ㄴ·ㄷ은 미지 길이 기호이며 꼭짓점 라벨이 아니다. 미지수 답은 채우지 않음.",
    ),
    (
        "C02",
        "P28",
        "R14 p002",
        "10",
        (0.515, 0.63, 0.95, 0.825),
        (0.67, 0.71, 0.80, 0.795),
        "solid",
        "cuboid",
        "보이는 모서리와 보이지 않는 꼭짓점",
        None,
        "문장에 직육면체 명시. 수치 미상으로 크기1×1×1.5은 예시 가정. 점선은 숨은 모서리이며 별도 면 위 선이 아니다.",
    ),
]

if __name__ == "__main__":
    prep.main()
    labels_path = prep.OUT / "labels.json"
    labels = json.loads(labels_path.read_text(encoding="utf8"))
    labels[1]["scene_candidate"]["size"] = {"width": 1, "depth": 1, "height": 1.5}
    labels[1]["assumptions"] = ["치수 미상. 1×1×1.5는 표시용 가정이며 실측값이 아님."]
    labels_path.write_text(
        json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf8"
    )
