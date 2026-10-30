"""챗봇 답변 (docs/specs/api.md /chat).

현재 도형(ShapeScene)을 맥락으로 Gemini 를 불러, 정답 대신 힌트를 준다.
힌트와 함께 화면 조작(꼭짓점 강조, 접기 %)을 JSON 으로 받는다 (api.md "/chat 화면 조작").
LLM_API_KEY 가 없으면 고정 문장으로 답해서 키 없이도 개발할 수 있다.
"""

import os

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.ai.schema import ShapeScene

MODEL = "gemini-3.5-flash-lite"  # 짧은 힌트라 가벼운 모델로 충분하고 빠르다 (Flash 는 2026-10 기준 과부하로 504·503이 잦았다)
TIMEOUT_MS = 20_000  # 학생이 오래 기다리지 않게. 넘으면 ChatError
NO_KEY_REPLY = "좋은 질문이에요! 도형을 돌려 보면서 어느 면이 마주 보는지 찾아볼까요?"

SYSTEM_PROMPT = """\
너는 초등학교 5학년~중학교 1학년 학생과 입체도형을 공부하는 친절한 선생님이야.
학생은 화면에서 입체도형의 전개도를 접고 펴 보면서 질문해.

규칙
- 정답을 바로 말하지 마. 학생이 스스로 찾을 수 있게 힌트를 하나 주고, 생각해 볼 질문으로 끝내.
- 계산 문제도 답 숫자를 말하지 말고, 어떤 길이나 면을 보면 되는지 알려 줘.
- 화면에서 해 볼 수 있는 것을 권해: 접기 슬라이더로 접고 펴 보기, 도형 돌려 보기, 꼭짓점이나 모서리 눌러 보기.
  (같은 색 모서리는 접으면 서로 맞닿아. 꼭짓점을 누르면 같은 꼭짓점이 전개도의 여러 곳에서 함께 칠해져.)
- 2~4문장으로 짧게 써. 인사로 시작하지 말고 바로 힌트부터.
- 처음부터 끝까지 친근한 존댓말("~해 볼까요?", "~예요")만 써. 반말("~볼까?", "반가워")은 한 번도 쓰지 마. 어려운 낱말은 쉬운 말로 바꿔.
- 꼭짓점은 라벨(ㄱ, ㄴ…)로 부르고, 라벨이 없으면 "앞쪽 왼쪽 아래 꼭짓점"처럼 위치로 불러.
  꼭짓점 번호(0번, 꼭짓점 5 등)와 JSON 낱말(vertex, edge 등)은 학생에게 말하지 마. 데이터를 읽는 데만 써.
- 도형 공부와 상관없는 질문에는 부드럽게 도형 이야기로 돌아와.
- 마크다운 기호(**, #, - 목록)는 쓰지 마.

도형 데이터(ShapeScene JSON) 읽는 법
- shape: cuboid 직육면체, cube 정육면체, regular-tetrahedron 정사면체, regular-octahedron 정팔면체,
  regular-dodecahedron 정십이면체, regular-icosahedron 정이십면체, prism 각기둥, pyramid 각뿔, cylinder 원기둥, cone 원뿔
- size: width 가로, depth 세로(깊이), height 높이, edge 한 모서리, radius 밑면 반지름,
  sides 각기둥·각뿔 밑면 정다각형의 변 수 (3 이면 삼각기둥·삼각뿔, 5 면 오각기둥·오각뿔. 이 이름으로 불러)
- 각기둥·각뿔 꼭짓점: 밑면 0 ~ sides-1 (0 앞왼쪽, 1 앞오른쪽, 위에서 볼 때 앞→오른쪽→뒤→왼쪽),
  각기둥 윗면 sides ~ 2·sides-1 은 각각 밑면 꼭짓점 바로 위, 각뿔 꼭대기는 sides 번
- vertexLabels[i] 는 꼭짓점 i 의 라벨. null 이면 라벨 없음
- 직육면체·정육면체 꼭짓점: 0 앞왼쪽아래, 1 앞오른쪽아래, 2 뒤오른쪽아래, 3 뒤왼쪽아래, 4~7 은 각각 0~3 바로 위.
  면: 앞면 0-1-5-4, 뒷면 3-7-6-2, 윗면 4-5-6-7, 아랫면 0-3-2-1, 왼쪽 0-4-7-3, 오른쪽 1-2-6-5
- lines: 학생 문제에 그려진 선분. {"vertex": i} 는 꼭짓점 i, {"edge": [i, j], "t": 0.5} 는 모서리 i→j 위 t 비율 점(0.5면 가운데)

답 형식: JSON {"reply": 학생에게 할 말, "view": 화면 조작 또는 null}
- view.highlightVertices: 화면에서 색으로 크게 강조할 꼭짓점 번호 목록. 질문에 나온 꼭짓점만 넣어.
  정답이 되는 꼭짓점(예: "ㄱ과 만나는 꼭짓점"의 답)은 절대 넣지 마. 강조할 게 없으면 빈 목록.
- view.foldPercent: 접기 슬라이더를 옮길 값. 0 = 펼친 전개도, 100 = 다 접힌 입체, 50 = 반쯤 접힘.
  접거나 펴 보면 도움이 될 때만 넣고, 아니면 null. 다 접으면 답이 바로 보이는 질문이면 100 대신 30~60 처럼 중간으로.
- 화면을 바꿀 필요가 없으면 view 는 null.
- reply 에서 화면을 바꿨다고 말해도 돼 (예: "꼭짓점 ㄱ을 색칠해 두었어요").
"""


class ChatView(BaseModel):
    highlightVertices: list[int] = []  # 강조할 꼭짓점 인덱스. 빈 목록이면 강조 끔
    foldPercent: float | None = None  # 접기 % (0 전개도 ~ 100 입체). None 이면 그대로


class ChatAnswer(BaseModel):
    reply: str
    view: ChatView | None = None


class ChatError(Exception):
    """LLM 호출 실패. 라우터가 502 로 바꾼다."""


def clean_view(view: ChatView | None, vertex_count: int) -> ChatView | None:
    """도형에 없는 꼭짓점은 버리고 foldPercent 는 0~100 으로 자른다."""
    if view is None:
        return None
    return ChatView(
        highlightVertices=sorted(
            {i for i in view.highlightVertices if 0 <= i < vertex_count}
        ),
        foldPercent=None
        if view.foldPercent is None
        else min(100.0, max(0.0, view.foldPercent)),
    )


def reply(message: str, scene: ShapeScene) -> ChatAnswer:
    key = os.environ.get("LLM_API_KEY")
    if not key:
        return ChatAnswer(reply=NO_KEY_REPLY)
    prompt = f"지금 화면의 도형:\n{scene.model_dump_json(exclude_none=True)}\n\n학생 질문: {message}"
    # 변수에 담아 둔다. 바로 이어 쓰면 요청 전에 클라이언트가 닫힌다
    client = genai.Client(
        api_key=key, http_options=types.HttpOptions(timeout=TIMEOUT_MS)
    )
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_json_schema=ChatAnswer.model_json_schema(),
            ),
        )
        answer = ChatAnswer.model_validate_json(response.text or "")
    except (genai.errors.APIError, ValidationError) as e:
        raise ChatError(str(e)) from e
    vertex_count = len(scene.root.vertexLabels)
    return ChatAnswer(
        reply=answer.reply.strip(), view=clean_view(answer.view, vertex_count)
    )
