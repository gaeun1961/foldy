import logging
import threading
import time

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.ai import chat, vision
from app.ai import record as rec
from app.ai.schema import ShapeScene

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/analyze")
async def analyze(
    file: UploadFile,
    problem: UploadFile | None = None,
    record: str | None = Form(
        None
    ),  # 기록 모드 (개발 전용, api.md): 묶음 id 와 화면 정보 JSON
    photo: UploadFile | None = None,  # 기록 모드: 원본 사진 (묶음마다 처음 한 번)
) -> ShapeScene:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "이미지 파일만 올릴 수 있어요")
    image = await file.read()
    problem_bytes = (
        await problem.read() if problem else None
    )  # 문제 칸 사진 (선택, 2단계 네모)
    trace = rec.begin()  # 꺼져 있어도 적기만 한다 (쓰는 것은 켜졌을 때만)

    def keep(result: dict) -> threading.Thread | None:
        """기록 모드면 응답을 막지 않게 따로 쓴다 (실패 응답도 남기려고 BackgroundTasks 대신 스레드)."""
        if not rec.enabled():
            return None
        trace["finished"] = time.time()
        args = (trace, image, file.content_type, problem_bytes, result, record)
        saving = threading.Thread(target=_save, args=(*args, photo_bytes), daemon=True)
        saving.start()
        return saving

    photo_bytes = (
        (await photo.read(), photo.content_type)
        if photo and rec.enabled()
        else (None, None)
    )
    try:
        # 인식은 오래 걸릴 수 있어(agy 는 15~20초) 다른 요청(/chat 등)을 막지 않게 스레드에서
        scene = await run_in_threadpool(
            vision.analyze_image, image, file.content_type, problem_bytes
        )
    except vision.VisionError as e:
        logger.warning(
            "사진 인식 실패: %s", e
        )  # 원인(429 한도, 시간 초과 등)은 서버 로그에만
        status = 503 if e.unavailable else 422
        # kind: 에러 종류 이름 (NotSolidError 면 입체도형 문제가 아님 #163, 그 밖은 VisionError). 증류에서 갈라 보려고
        keep({"error": str(e)[:500], "status": status, "kind": type(e).__name__})
        if e.unavailable:
            raise HTTPException(503, "지금은 사진 인식을 쓸 수 없어요") from e
        raise HTTPException(422, "사진에서 도형을 찾지 못했어요") from e
    keep(scene.model_dump(by_alias=True, exclude_none=True))
    return scene


def _save(trace, image, content_type, problem, result, record, photo) -> None:
    try:
        rec.write(trace, image, content_type, problem, result, record, *photo)
    except Exception as e:  # noqa: BLE001 — 기록이 실패해도 서버는 그대로
        logger.warning("기록 모드 쓰기 실패: %s", e)


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
