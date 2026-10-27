"""챗봇 화면 조작 검사 (docs/specs/api.md "/chat 화면 조작"). 실행: python -m tests.test_chat

LLM 은 부르지 않는다. 범위 밖 값을 거르는 clean_view 와 키가 없을 때의 고정 답만 본다.
"""

import os

from app.ai import chat
from app.ai.chat import ChatView, clean_view
from app.ai.vision import MOCK_SCENE

assert clean_view(None, 8) is None
v = clean_view(ChatView(highlightVertices=[5, 0, 8, -1, 5], foldPercent=130), 8)
assert v.highlightVertices == [0, 5], v  # 없는 꼭짓점(8, -1)은 버리고 중복은 하나로
assert v.foldPercent == 100, v
assert clean_view(ChatView(foldPercent=-5), 8).foldPercent == 0
assert clean_view(ChatView(), 8) == ChatView(highlightVertices=[], foldPercent=None)

os.environ.pop("LLM_API_KEY", None)
answer = chat.reply("안녕", MOCK_SCENE)
assert answer.reply == chat.NO_KEY_REPLY and answer.view is None

print("ok: 챗봇 화면 조작 (범위 밖 값 거르기, 키 없음)")
