"""학습지 사진 → ShapeScene (docs/specs/api.md /analyze).

recognize(): 비전 LLM(Gemini)에 사진과 VISION_PROMPT 를 보내 ShapeScene 을 받는다 (TODO-7 정확도 측정에도 쓴다).
analyze_image(): /analyze 가 부른다. 같은 사진은 기억해 둔 결과를 쓰고, 모델이 붐비면 한 번 더 부른다 (api.md "/analyze 에러").
  API 를 못 쓰고 VISION_CLI=1 이면 recognize_cli() 로 Gemini CLI 에 한 번 더 묻는다 (시연 노트북용 비상 경로).
  VISION_ENGINE=agy 면 API 대신 recognize_agy() 로 Antigravity CLI 가 읽는다 (팀 테스트용, docs/specs/worksheets.md).
"""

import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

import httpx
from google import genai
from google.genai import types
from pydantic import ValidationError

from app.ai.schema import ShapeScene
from app.ai.vision_prompt import VISION_PROMPT

MODEL = "gemini-3.5-flash"  # 그림을 읽고 꼭짓점 번호를 맞춰야 해서 챗봇(lite)보다 큰 모델. 비교는 eval/vision_eval.py --model
TIMEOUT_MS = 60_000

REMEMBER = 100  # 같은 사진 결과를 기억하는 수 (무료 한도 모델당 하루 20번을 아끼려고)

# 검사(tests/)에서만 쓰는 예시 도형. /analyze 는 실패해도 이것을 돌려주지 않는다
MOCK_SCENE = ShapeScene.model_validate(
    {
        "shape": "cuboid",
        "size": {"width": 4, "depth": 2, "height": 3},
        "vertexLabels": ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"],
        "lines": [
            {"from": {"vertex": 0}, "to": {"vertex": 5}},
            {"from": {"edge": [4, 5], "t": 0.5}, "to": {"edge": [6, 7], "t": 0.5}},
        ],
        "net": {"layout": "cross"},
    }
)


class VisionError(Exception):
    """사진 인식 실패. unavailable=True 면 지금 인식을 쓸 수 없음(키 없음, 한도 초과, 과부하, 시간 초과) → 503,
    False 면 사진에서 도형을 읽지 못함(답이 ShapeScene 이 아님) → 422."""

    def __init__(self, message: str, unavailable: bool = True):
        super().__init__(message)
        self.unavailable = unavailable


def recognize(image: bytes, content_type: str, model: str = MODEL) -> ShapeScene:
    key = os.environ.get("LLM_API_KEY")
    if not key:
        raise VisionError("LLM_API_KEY 가 없다")
    # 변수에 담아 둔다. 바로 이어 쓰면 요청 전에 클라이언트가 닫힌다 (chat.py 와 같음)
    client = genai.Client(
        api_key=key, http_options=types.HttpOptions(timeout=TIMEOUT_MS)
    )
    try:
        response = client.models.generate_content(
            model=model,
            contents=[types.Part.from_bytes(data=image, mime_type=content_type)],
            # ShapeScene 은 도형별 union 이라 response_json_schema 대신 프롬프트로 형식을 주고 Pydantic 으로 검증한다
            config=types.GenerateContentConfig(
                system_instruction=VISION_PROMPT,
                response_mime_type="application/json",
            ),
        )
        text = response.text or ""
    # 시간 초과는 genai 가 httpx 예외 그대로 올린다
    except (genai.errors.APIError, httpx.TimeoutException) as e:
        raise VisionError(f"{type(e).__name__}: {e}") from e
    try:
        return ShapeScene.model_validate_json(text)
    except ValidationError as e:
        raise VisionError(f"ShapeScene 아님: {e}", unavailable=False) from e


_remembered: dict[
    str, ShapeScene
] = {}  # 사진 해시 → 결과. 성공만, 오래된 것부터 버린다


CLI_TIMEOUT_S = 120  # CLI 는 띄우는 시간까지 들어서 API 보다 넉넉히


def cli_scene(stdout: str) -> ShapeScene:
    """`gemini --output-format json` 출력 → ShapeScene. 답이 ```json 으로 감싸여 와도 { } 사이만 쓴다."""
    try:
        text = json.loads(stdout)["response"]
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        raise VisionError(f"Gemini CLI 출력이 이상하다: {stdout[:200]}") from e
    try:
        return ShapeScene.model_validate_json(
            text[text.find("{") : text.rfind("}") + 1]
        )
    except ValidationError as e:
        raise VisionError(f"ShapeScene 아님: {e}", unavailable=False) from e


def recognize_cli(image: bytes, content_type: str) -> ShapeScene:
    """비상 경로 (api.md "/analyze 에러"): 이 컴퓨터에 로그인된 Gemini CLI 로 사진을 읽는다.
    사진은 임시 폴더에 두고 @파일 로 넘긴다. 프롬프트는 길고 줄바꿈이 있어 stdin 으로 (Windows .cmd 인자로는 깨진다)."""
    exe = shutil.which("gemini")
    if not exe:
        raise VisionError("Gemini CLI(gemini) 가 설치돼 있지 않다")
    with tempfile.TemporaryDirectory() as folder:
        name = "photo" + (mimetypes.guess_extension(content_type) or ".jpg")
        (Path(folder) / name).write_bytes(image)
        ask = f"@{name} Read this worksheet photo and answer with one JSON only, following the instructions above."
        try:
            done = subprocess.run(
                [exe, "-p", ask, "--output-format", "json"],
                check=False,  # 실패는 아래 returncode 로 본다
                input=VISION_PROMPT,
                cwd=folder,
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=CLI_TIMEOUT_S,
            )
        except subprocess.TimeoutExpired as e:
            raise VisionError("Gemini CLI 시간 초과") from e
    if done.returncode != 0:
        raise VisionError(f"Gemini CLI 실패: {done.stderr[-300:]}")
    return cli_scene(done.stdout)


AGY_MODEL = "gemini-3.8-flash-medium"  # low 는 15초지만 전개도 모양을 틀렸다 (worksheets.md W0, 2026-10-31)
AGY_TIMEOUT_S = 300  # medium 은 사진 한 장에 2분쯤 걸린다
_agy_lock = threading.Lock()  # 한 번에 하나만 (팀원 여럿이 동시에 올리면 차례로)


def recognize_agy(image: bytes, content_type: str) -> ShapeScene:
    """팀 테스트용 엔진 (worksheets.md W1): 이 컴퓨터에 로그인된 Antigravity CLI(agy)로 사진을 읽는다.
    사진은 임시 폴더에 두고 프롬프트 앞 @파일 로 붙인다. 명령 실행은 허락하지 않는다(--sandbox, 권한 건너뛰기 없음).
    출력은 {"response": "```json ...```"} 모양이라 cli_scene 으로 읽는다."""
    exe = shutil.which("agy")
    if not exe:
        raise VisionError("Antigravity CLI(agy) 가 설치돼 있지 않다")
    model = os.environ.get("VISION_AGY_MODEL") or AGY_MODEL
    with _agy_lock, tempfile.TemporaryDirectory() as folder:
        name = "photo" + (mimetypes.guess_extension(content_type) or ".jpg")
        (Path(folder) / name).write_bytes(image)
        ask = (
            f"@{name}\n\n{VISION_PROMPT}\n\n붙인 {name} 이 학습지 사진이다. "
            "명령을 실행하거나 파일을 만들지 말고, 사진을 보고 위 지시대로 JSON 하나만 답해."
        )
        try:
            # agy 는 .exe 라 긴 프롬프트도 인자로 넘어간다 (Gemini CLI 의 .cmd 와 다름)
            done = subprocess.run(
                [exe, "-p", ask, "--output-format", "json", "--model", model]
                + [
                    "--sandbox",
                    "--add-dir",
                    folder,
                    "--print-timeout",
                    f"{AGY_TIMEOUT_S - 20}s",
                ],
                check=False,  # 실패는 아래 returncode 로 본다
                cwd=folder,
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=AGY_TIMEOUT_S,
            )
        except subprocess.TimeoutExpired as e:
            raise VisionError("Antigravity CLI 시간 초과") from e
    if done.returncode != 0:
        raise VisionError(f"Antigravity CLI 실패: {done.stderr[-300:]}")
    return cli_scene(done.stdout)


def _recognize_api(image: bytes, content_type: str) -> ShapeScene:
    try:
        return recognize(image, content_type)
    except VisionError as e:
        if "UNAVAILABLE" not in str(
            e
        ):  # 과부하(503)만 한 번 더. 한도 초과·시간 초과는 바로 실패
            raise
        time.sleep(2)
        return recognize(image, content_type)


def analyze_image(image: bytes, content_type: str) -> ShapeScene:
    key = hashlib.sha256(image).hexdigest()
    if key in _remembered:
        return _remembered[key]
    if os.environ.get("VISION_ENGINE") == "agy":
        scene = recognize_agy(image, content_type)
        _remember(key, scene)
        return scene
    try:
        scene = _recognize_api(image, content_type)
    except VisionError as e:
        # API 를 지금 못 쓰면(한도·과부하·키 없음) VISION_CLI=1 일 때만 Gemini CLI 로 한 번 더
        if not (e.unavailable and os.environ.get("VISION_CLI") == "1"):
            raise
        scene = recognize_cli(image, content_type)
    _remember(key, scene)
    return scene


def _remember(key: str, scene: ShapeScene) -> None:
    if len(_remembered) >= REMEMBER:
        _remembered.pop(next(iter(_remembered)))
    _remembered[key] = scene
