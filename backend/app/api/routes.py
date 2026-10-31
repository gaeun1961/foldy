import logging

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.ai import chat, vision
from app.ai.schema import ShapeScene

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/analyze")
async def analyze(file: UploadFile, problem: UploadFile | None = None) -> ShapeScene:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "이미지 파일만 올릴 수 있어요")
    try:
        # 인식은 오래 걸릴 수 있어(agy 는 2분쯤) 다른 요청(/chat 등)을 막지 않게 스레드에서
        return await run_in_threadpool(
            vision.analyze_image,
            await file.read(),
            file.content_type,
            await problem.read()
            if problem
            else None,  # 문제 칸 사진 (선택, 2단계 네모)
        )
    except vision.VisionError as e:
        logger.warning(
            "사진 인식 실패: %s", e
        )  # 원인(429 한도, 시간 초과 등)은 서버 로그에만
        if e.unavailable:
            raise HTTPException(503, "지금은 사진 인식을 쓸 수 없어요") from e
        if isinstance(
            e, vision.NotSolidError
        ):  # 입체도형 문제가 아님 (#163, api.md "/analyze 에러")
            raise HTTPException(
                422,
                "이 문제는 입체도형 전개도 문제가 아니에요. 아래에서 직접 만들어 볼 수 있어요",
            ) from e
        raise HTTPException(422, "사진에서 도형을 찾지 못했어요") from e


class ChatRequest(BaseModel):
    message: str
    scene: ShapeScene


@router.post("/chat")
def chat_endpoint(req: ChatRequest) -> chat.ChatAnswer:
    try:
        return chat.reply(req.message, req.scene)
    except chat.ChatError as e:
        raise HTTPException(
            502, "답변을 가져오지 못했어요. 잠시 뒤 다시 물어봐 주세요"
        ) from e
