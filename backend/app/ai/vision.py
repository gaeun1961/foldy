from app.ai.schema import ShapeScene

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


def analyze_image(image: bytes, content_type: str) -> ShapeScene:
    # TODO(AI): 비전 LLM 연결 위치.
    #   os.environ["LLM_API_KEY"] 로 호출 → 응답 JSON 을 ShapeScene.model_validate 로 검증해서 반환.
    #   검증 실패 시 예외를 올려서 frontend 가 수동 입력 경로로 넘어가게 한다.
    return MOCK_SCENE
