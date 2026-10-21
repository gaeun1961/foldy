from app.ai.schema import ShapeScene


def reply(message: str, scene: ShapeScene) -> str:
    # TODO(AI): LLM 챗봇 연결 위치. scene 을 문맥으로 넣어 힌트를 생성하고,
    #   화면 조작(회전, 접기 등)이 필요하면 응답 형식을 이슈로 합의한 뒤 확장한다.
    return "좋은 질문이에요! 도형을 돌려 보면서 어느 면이 마주 보는지 찾아볼까요?"
