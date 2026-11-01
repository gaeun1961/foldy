"""/analyze 응답 검사 (docs/specs/api.md "/analyze 에러"). 실행: python -m tests.test_analyze

LLM 은 부르지 않는다. vision.recognize 를 가짜로 바꿔서 성공·422·503, 과부하 재시도, 같은 사진 기억을 본다.
"""

import json
import os
import threading

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

# 입체도형 문제가 아님 (#163): 모델이 {"notSolid": true} 로 답하면 다른 안내로 422, 기억하지 않는다
try:
    vision.to_scene('{"notSolid": true, "problem": "직사각형 종이 ABCD 를 접었다"}')
    raise AssertionError("notSolid 인데 ShapeScene 이 됐다")
except vision.NotSolidError:
    pass
try:
    cli_scene(json.dumps({"response": '```json {"notSolid": true} ```'}))
    raise AssertionError("CLI 답의 notSolid 를 놓쳤다")
except vision.NotSolidError:
    pass
fake(vision.NotSolidError(), vision.NotSolidError())
r = post(b"photo-flat")
assert r.status_code == 422 and r.json()["detail"].startswith(
    "이 문제는 입체도형 전개도 문제가 아니에요"
), r.text
assert post(b"photo-flat").status_code == 422 and calls.count(b"photo-flat") == 2, calls

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

# 문제 칸 (2단계 네모, worksheets.md): 도형과 동시에 글자만 읽어 problem 을 채운다. 못 읽어도 도형은 그대로
texts = {b"q-ok": "다음 전개도로 ㉠에 알맞은 수를 구하세요.", b"q-bad": None}
vision.read_problem = lambda image, content_type: texts[image]


def post2(image: bytes, problem: bytes):
    files = {
        "file": ("photo.jpg", image, "image/jpeg"),
        "problem": ("q.jpg", problem, "image/jpeg"),
    }
    return client.post("/analyze", files=files)


fake(MOCK_SCENE)
r = post2(b"photo-q", b"q-ok")
assert r.status_code == 200 and r.json()["problem"].startswith("다음 전개도로"), (
    r.json()
)
fake(MOCK_SCENE)
r = post2(b"photo-q", b"q-bad")  # 같은 도형 사진이라도 문제 칸이 다르면 따로 기억
assert (
    r.status_code == 200 and calls == [b"photo-q"] and r.json().get("problem") is None
)

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

# agy 실행 (ai/agy.py, worksheets.md C): 미리 띄워 둔 것을 쓰고, 늦으면 하나 더 보내 먼저 온 답. agy 는 가짜
# (위에서 time.sleep 을 없앴으니 기다림은 Event.wait)
from app.ai import agy

plan: list[
    tuple[float, str | None]
] = []  # 띄우는 차례대로 (걸리는 초, 답. None 이면 실패)
spawned: list["FakeProc"] = []


class FakeProc:
    def __init__(self, model: str):
        self.delay, self.answer = plan.pop(0) if plan else (0.0, "idle")
        self.killed = threading.Event()
        self.used = False
        spawned.append(self)

    def fresh(self) -> bool:
        return not self.killed.is_set()

    def ask(self, image, content_type, ask):
        self.used = True
        if self.killed.wait(self.delay):
            raise agy.AgyError("꺼졌다")
        if self.answer is None:
            raise agy.AgyError("Antigravity CLI 실패: 가짜")
        return json.dumps({"response": self.answer})

    def kill(self):
        self.killed.set()


agy._Proc = FakeProc
agy.HEDGE_S = 0.2
lock = threading.Semaphore(3)


def agy_answer():
    return json.loads(vision._run_agy(b"img", "image/jpeg", "{name}", "m", lock))[
        "response"
    ]


plan[:] = [(0.0, "빠름")]
assert agy_answer() == "빠름" and len([p for p in spawned if p.used]) == 1
spawned.clear()
plan[:] = [(2.0, "늦음"), (0.0, "하나 더")]  # 첫 요청이 늦으면 하나 더, 늦은 쪽은 끈다
assert agy_answer() == "하나 더"
used = [p for p in spawned if p.used]
assert len(used) == 2 and used[0].killed.is_set(), used
spawned.clear()
# 하나 더 보내려고 꺼내는 중에 첫 답이 오면, 늦게 꺼낸 것은 묻지 않고 끈다 (사용량을 아끼려고)
slow_take = threading.Event()
real_take = agy._take


def take_slow(model):
    if len(spawned) >= 1:  # 두 번째 꺼내기는 첫 답보다 늦게 끝난다
        slow_take.wait(1.0)
    return real_take(model)


agy._take = take_slow
plan[:] = [(0.4, "첫 답"), (0.0, "늦게 꺼냄")]
agy._pool.clear()
assert agy_answer() == "첫 답"
slow_take.set()
for _ in range(50):
    if len(spawned) >= 2 and spawned[1].killed.is_set():
        break
    threading.Event().wait(0.02)
assert len(spawned) >= 2 and not spawned[1].used and spawned[1].killed.is_set(), [
    (p.used, p.killed.is_set()) for p in spawned
]
agy._take = real_take
spawned.clear()
plan[:] = [(0.0, None)]  # 빨리 실패하면 하나 더 보내지 않고 503 쪽 에러
try:
    agy_answer()
    raise AssertionError("실패가 그냥 지나갔다")
except VisionError as e:
    assert e.unavailable and "가짜" in str(e)
assert len([p for p in spawned if p.used]) == 1
spawned.clear()
plan[:] = []
agy._pool.clear()
agy.warm("m", 2)  # 미리 띄워 두면 요청은 그것을 쓰고, 다시 채운다
assert len(spawned) == 2
first = spawned[0:2]
agy_answer()
assert any(p.used for p in first)
for _ in range(50):
    if len(agy._pool["m"]) == 2:
        break
    threading.Event().wait(0.02)
assert len(agy._pool["m"]) == 2 and len(spawned) == 3, (agy._pool, spawned)

# 기록 모드 (worksheets.md H, #159): 켜졌을 때만 evals/cases/ 에 읽기 한 번을 폴더 하나로. 꺼지면 아무것도 안 쓴다
import tempfile
from pathlib import Path

from app.ai import record as rec

vision.read_problem = lambda image, content_type: (
    "문제 글"
)  # 문제 글을 읽어야 기억한다 (아래 cache)
cases = Path(tempfile.mkdtemp())
rec.ROOT = cases


def wait_files(pattern: str, count: int):
    for _ in range(100):
        found = sorted(cases.glob(pattern))
        if len(found) >= count:
            return found
        threading.Event().wait(0.02)
    raise AssertionError(f"기록이 안 생겼다: {pattern} {sorted(cases.rglob('*'))}")


fake(MOCK_SCENE)
assert post(b"photo-rec-off").status_code == 200
threading.Event().wait(0.1)
assert not any(cases.iterdir()), "꺼져 있으면 쓰지 않는다"

os.environ["VISION_RECORD"] = "1"
fake(MOCK_SCENE)
r = client.post(
    "/analyze",
    files={
        "file": ("photo.jpg", b"photo-rec-1", "image/jpeg"),
        "problem": ("q.jpg", b"q-rec", "image/jpeg"),
        "photo": ("whole.jpg", b"whole-photo", "image/jpeg"),
    },
    data={"record": json.dumps({"session": "s1abc", "suggested": [[0, 0, 1, 1]]})},
)
assert r.status_code == 200
(meta_path,) = wait_files("*/read-1/meta.json", 1)
read = meta_path.parent
meta = json.loads(meta_path.read_text(encoding="utf-8"))
assert meta["source"] == "api" and meta["seconds"] >= 0 and meta["problem_sha256"], meta
assert (read / "shape.jpg").read_bytes() == b"photo-rec-1"
assert (read / "problem.jpg").read_bytes() == b"q-rec"
assert (
    json.loads((read / "result.json").read_text(encoding="utf-8"))["shape"] == "cuboid"
)
session = json.loads((read.parent / "session.json").read_text(encoding="utf-8"))
assert (
    session["session"] == "s1abc"
    and session["suggested"] == [[0, 0, 1, 1]]
    and session["reads"] == ["read-1"]
)
assert (read.parent / "photo.jpg").read_bytes() == b"whole-photo"

# 같은 묶음의 두 번째 읽기는 같은 폴더 read-2. 같은 사진(바이트)이면 출처는 기억(cache)
fake()
r = client.post(
    "/analyze",
    files={
        "file": ("photo.jpg", b"photo-rec-1", "image/jpeg"),
        "problem": ("q.jpg", b"q-rec", "image/jpeg"),
    },
    data={"record": json.dumps({"session": "s1abc"})},
)
assert r.status_code == 200 and calls == []
(meta2,) = wait_files("*/read-2/meta.json", 1)
assert json.loads(meta2.read_text(encoding="utf-8"))["source"] == "cache"
assert meta2.parent.parent == read.parent

# 실패도 남긴다 (422·503), record 가 깨져 있어도 쓴다
fake(VisionError("ShapeScene 아님", unavailable=False))
r = client.post(
    "/analyze",
    files={"file": ("photo.jpg", b"photo-rec-bad", "image/jpeg")},
    data={"record": "{깨짐"},
)
assert r.status_code == 422
results = [
    json.loads(p.read_text(encoding="utf-8"))
    for p in cases.glob("*/read-*/result.json")
]
for _ in range(100):
    results = [
        json.loads(p.read_text(encoding="utf-8"))
        for p in cases.glob("*/read-*/result.json")
    ]
    if any(x.get("status") == 422 for x in results):
        break
    threading.Event().wait(0.02)
assert any(
    x.get("status") == 422 and "ShapeScene" in x["error"] and x["kind"] == "VisionError"
    for x in results
), results
del os.environ["VISION_RECORD"]

print(
    "ok: /analyze (400·422·503, 과부하 한 번 재시도, 같은 사진 기억, 실패는 기억 안 함, Gemini CLI 비상 경로, agy 팀 테스트 엔진, agy 미리 띄워 두기·늦으면 하나 더, 문제 칸, 입체도형 문제가 아님, 기록 모드)"
)
