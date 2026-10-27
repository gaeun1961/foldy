from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from app.ai import chat, vision
from app.ai.schema import ShapeScene

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/analyze")
async def analyze(file: UploadFile) -> ShapeScene:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "이미지 파일만 올릴 수 있어요")
    return vision.analyze_image(await file.read(), file.content_type)


class ChatRequest(BaseModel):
    message: str
    scene: ShapeScene


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat")
def chat_endpoint(req: ChatRequest) -> ChatResponse:
    try:
        return ChatResponse(reply=chat.reply(req.message, req.scene))
    except chat.ChatError as e:
        raise HTTPException(
            502, "답변을 가져오지 못했어요. 잠시 뒤 다시 물어봐 주세요"
        ) from e
