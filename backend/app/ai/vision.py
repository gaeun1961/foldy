"""학습지 사진 → ShapeScene (docs/specs/api.md /analyze).

recognize(): 비전 LLM(Gemini)에 사진과 VISION_PROMPT 를 보내 ShapeScene 을 받는다 (TODO-7 정확도 측정에도 쓴다).
analyze_image(): /analyze 가 부른다. 같은 사진은 기억해 둔 결과를 쓰고, 모델이 붐비면 한 번 더 부른다 (api.md "/analyze 에러").
"""

import hashlib
import os
import time

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


def analyze_image(image: bytes, content_type: str) -> ShapeScene:
    key = hashlib.sha256(image).hexdigest()
    if key in _remembered:
        return _remembered[key]
    try:
        scene = recognize(image, content_type)
    except VisionError as e:
        if "UNAVAILABLE" not in str(
            e
        ):  # 과부하(503)만 한 번 더. 한도 초과·시간 초과는 바로 실패
            raise
        time.sleep(2)
        scene = recognize(image, content_type)
    if len(_remembered) >= REMEMBER:
        _remembered.pop(next(iter(_remembered)))
    _remembered[key] = scene
    return scene
