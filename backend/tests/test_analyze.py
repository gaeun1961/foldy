"""/analyze 응답 검사 (docs/specs/api.md "/analyze 에러"). 실행: python -m tests.test_analyze

LLM 은 부르지 않는다. vision.recognize 를 가짜로 바꿔서 성공·422·503, 과부하 재시도, 같은 사진 기억을 본다.
"""

import json
import os

from fastapi.testclient import TestClient

from app.ai import vision
from app.ai.vision import MOCK_SCENE, VisionError, cli_scene
from app.main import app

client = TestClient(app)
calls: list[bytes] = []
vision.time.sleep = lambda _: None  # 재시도 기다림 없이


def post(image: bytes, content_type="image/jpeg"):
    return client.post("/analyze", files={"file": ("photo.jpg", image, content_type)})


def fake(*results):
    """recognize 를 차례로 results 를 돌려주는(예외면 던지는) 가짜로."""
    queue = list(results)

    def recognize(image, content_type, model=vision.MODEL):
        calls.append(image)
        r = queue.pop(0)
        if isinstance(r, Exception):
            raise r
        return r

    vision.recognize = recognize
    calls.clear()


# 이미지가 아니면 400
assert post(b"x", "text/plain").status_code == 400

# 성공: 인식 결과를 그대로
fake(MOCK_SCENE)
r = post(b"photo-1")
assert r.status_code == 200 and r.json()["shape"] == "cuboid", r.text

# 같은 사진은 다시 부르지 않는다
fake()  # 부르면 빈 목록에서 꺼내다 실패한다
assert post(b"photo-1").status_code == 200 and calls == []

# 사진에서 도형을 못 읽음 → 422
fake(VisionError("ShapeScene 아님", unavailable=False))
r = post(b"photo-2")
assert r.status_code == 422 and r.json()["detail"] == "사진에서 도형을 찾지 못했어요", (
    r.text
)

# 한도 초과·키 없음·시간 초과 → 503, 다시 부르지 않는다
fake(VisionError("ClientError: 429 RESOURCE_EXHAUSTED"))
r = post(b"photo-3")
assert (
    r.status_code == 503 and r.json()["detail"] == "지금은 사진 인식을 쓸 수 없어요"
), r.text
assert len(calls) == 1

# 과부하(503 UNAVAILABLE)는 한 번 더 부른다
fake(VisionError("ServerError: 503 UNAVAILABLE"), MOCK_SCENE)
assert post(b"photo-4").status_code == 200 and len(calls) == 2
fake(
    VisionError("ServerError: 503 UNAVAILABLE"),
    VisionError("ServerError: 503 UNAVAILABLE"),
)
assert post(b"photo-5").status_code == 503 and len(calls) == 2

# 실패한 사진은 기억하지 않는다 (다음에 다시 부른다)
fake(MOCK_SCENE)
assert post(b"photo-3").status_code == 200 and len(calls) == 1

# Gemini CLI 비상 경로: VISION_CLI=1 이고 API 를 못 쓸 때만 (CLI 도 가짜로)
cli_calls: list[bytes] = []


def fake_cli(image, content_type):
    cli_calls.append(image)
    return MOCK_SCENE


vision.recognize_cli = fake_cli
fake(VisionError("ClientError: 429 RESOURCE_EXHAUSTED"))
assert post(b"photo-6").status_code == 503 and cli_calls == []  # 꺼져 있으면 안 부른다
os.environ["VISION_CLI"] = "1"
fake(VisionError("ClientError: 429 RESOURCE_EXHAUSTED"))
assert post(b"photo-7").status_code == 200 and cli_calls == [b"photo-7"]
fake(VisionError("ShapeScene 아님", unavailable=False))
assert (
    post(b"photo-8").status_code == 422 and len(cli_calls) == 1
)  # 못 읽은 사진은 CLI 로 넘기지 않는다
del os.environ["VISION_CLI"]

# 팀 테스트 엔진 (worksheets.md W1): VISION_ENGINE=agy 면 API 를 부르지 않고 agy 로, 결과는 기억, 실패는 같은 표대로
agy_calls: list[bytes] = []


def fake_agy(image, content_type):
    agy_calls.append(image)
    if image == b"photo-agy-bad":
        raise VisionError("ShapeScene 아님", unavailable=False)
    return MOCK_SCENE


vision.recognize_agy = fake_agy
os.environ["VISION_ENGINE"] = "agy"
fake()  # API 가 불리면 빈 큐에서 IndexError
assert post(b"photo-agy").status_code == 200 and agy_calls == [b"photo-agy"]
assert post(b"photo-agy").status_code == 200 and len(agy_calls) == 1  # 같은 사진은 기억
assert post(b"photo-agy-bad").status_code == 422 and calls == []
del os.environ["VISION_ENGINE"]

# CLI 출력 읽기: ```json 으로 감싸여 와도, 이상한 출력은 503 쪽 에러
scene_json = MOCK_SCENE.model_dump_json(by_alias=True)
wrapped = json.dumps({"response": f"```json\n{scene_json}\n```"})
assert cli_scene(wrapped).root.shape == "cuboid"
for bad, unavailable in (("not json", True), (json.dumps({"response": "{}"}), False)):
    try:
        cli_scene(bad)
        raise AssertionError("에러가 나야 한다")
    except VisionError as e:
        assert e.unavailable == unavailable, bad

print(
    "ok: /analyze (400·422·503, 과부하 한 번 재시도, 같은 사진 기억, 실패는 기억 안 함, Gemini CLI 비상 경로, agy 팀 테스트 엔진)"
)
