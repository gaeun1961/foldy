"""심사 일관성·자료 분리·입력 경로 검증. 실제 모델을 호출하지 않는다."""

import hashlib
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from pydantic import ValidationError

from app.ai.vision_prompt import VISION_PROMPT
from evals.judge import (
    Review,
    digest,
    make_prompt,
    prepare,
    reconcile,
    reuse_review,
    run,
    write,
)


def main():
    data = dict.fromkeys(
        ("shape", "dimensions", "layout", "labels", "lines", "scope"), "pass"
    )
    good = Review(verdict="correct", reason="사진과 일치", **data)
    bad_data = {**data, "labels": "fail"}
    bad = Review(verdict="incorrect", reason="라벨 위치 다름", **bad_data)
    assert reconcile(good, good) == "agreed_correct"
    assert reconcile(good, bad) == "human_review"
    try:
        Review(verdict="correct", reason="오류", **bad_data)
        raise AssertionError("모순된 심사를 허용함")
    except ValidationError:
        pass
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "image.png").write_bytes(b"synthetic-input")
        (root / "prediction.json").write_text('{"notSolid":true}', encoding="utf-8")
        row = {
            "id": "A",
            "kind": "flat",
            "split": "development",
            "image": "image.png",
            "prediction": "prediction.json",
        }
        manifest = root / "manifest.json"
        manifest.write_text(json.dumps([row]), encoding="utf-8")
        cases = prepare(manifest)
        assert len(cases[0]["image_sha256"]) == 64
        run(cases, root / "out", False)
        result = json.loads((root / "out/summary.json").read_text())
        assert result[0]["status"] == "prepared"
        assert result[0]["human_approved"] is False
        with patch(
            "evals.judge.judge", side_effect=[RuntimeError("model_not_found"), good]
        ) as mocked:
            run(cases, root / "partial", True)
            assert mocked.call_count == 2
        partial = json.loads((root / "partial/summary.json").read_text())
        assert partial[0]["status"] == "partial_review"
        assert "reviewer-1" in partial[0]["errors"]
        assert partial[0]["human_approved"] is False
        with patch("evals.judge.judge", side_effect=[good, good]) as mocked:
            run(cases, root / "pair", True)
            assert mocked.call_args_list[0].args[1] == "gpt-6-astra"
            assert mocked.call_args_list[1].args[1] == "gpt-6-astra"
            assert mocked.call_args_list[0].args[2] != mocked.call_args_list[1].args[2]
        original = root / "saved/A/gpt-6-astra"
        original.mkdir(parents=True)
        schema = root / "schema.json"
        write(schema, Review.model_json_schema())
        provenance = {
            "requested_model": "gpt-6-astra",
            "reasoning_effort": "low",
            "prompt_sha256": hashlib.sha256(make_prompt(cases[0]).encode()).hexdigest(),
            "contract_sha256": hashlib.sha256(VISION_PROMPT.encode()).hexdigest(),
            "schema_sha256": digest(schema),
            "input": cases[0],
        }
        write(original / "provenance.json", provenance)
        write(original / "review.json", good.model_dump())
        (original / "events.jsonl").write_text(
            '{"type":"turn.completed"}\n', encoding="utf-8"
        )
        (original / "stderr.txt").write_text("", encoding="utf-8")
        target = root / "reused"
        target.mkdir()
        assert reuse_review(cases[0], root / "saved", target) == good
        provenance["prompt_sha256"] = "changed"
        write(original / "provenance.json", provenance)
        try:
            reuse_review(cases[0], root / "saved", target)
            raise AssertionError("변경된 프롬프트 재사용")
        except ValueError:
            pass
        provenance["prompt_sha256"] = hashlib.sha256(
            make_prompt(cases[0]).encode()
        ).hexdigest()
        write(original / "provenance.json", provenance)
        (original / "events.jsonl").write_text(
            '{"type":"turn.completed"}\n{"item":{"type":"command_execution"}}\n',
            encoding="utf-8",
        )
        try:
            reuse_review(cases[0], root / "saved", target)
            raise AssertionError("도구 사용 심사 재사용")
        except ValueError:
            pass
        for invalid in (
            [row, row],
            [{**row, "id": "../outside"}],
            [row, {**row, "id": "B", "split": "heldout"}],
        ):
            manifest.write_text(json.dumps(invalid), encoding="utf-8")
            try:
                prepare(manifest)
                raise AssertionError("잘못된 자료를 허용함")
            except ValueError:
                pass
    print("심사 검증 통과")


if __name__ == "__main__":
    main()
