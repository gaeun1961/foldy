"""학습지 사진 → ShapeScene (docs/specs/api.md /analyze).

recognize(): 비전 LLM(Gemini)에 사진과 VISION_PROMPT 를 보내 ShapeScene 을 받는다 (TODO-7 정확도 측정에 쓴다).
analyze_image(): /analyze 가 부른다. 아직 목 데이터를 돌려준다. recognize 로 바꾸는 것은 TODO-8.
"""

import os

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.ai.schema import ShapeScene
from app.ai.vision_prompt import VISION_PROMPT

MODEL = "gemini-3.5-flash"  # 그림을 읽고 꼭짓점 번호를 맞춰야 해서 챗봇(lite)보다 큰 모델. 비교는 eval/vision_eval.py --model
TIMEOUT_MS = 60_000

# frontend/src/shared/mock.ts 의 mockScene 과 같은 내용
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
    """키 없음, LLM 호출 실패, 응답이 ShapeScene 이 아님."""


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
        return ShapeScene.model_validate_json(response.text or "")
    except (genai.errors.APIError, ValidationError) as e:
        raise VisionError(str(e)) from e


def analyze_image(image: bytes, content_type: str) -> ShapeScene:
    # TODO(AI, TODO-8): recognize 로 바꾸고, VisionError 를 정해진 에러 응답으로 돌려 frontend 가 수동 입력으로 넘어가게 한다
    return MOCK_SCENE
