import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai import vision
from app.api.routes import router

# Vite 개발 서버. 휴대폰에서 PC 주소로 열면 .env 의 CORS_ORIGINS 에 그 주소를 더한다 (docs/specs/mobile.md)
ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"] + [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    vision.warm_up()  # 팀 테스트 엔진(agy)이면 미리 띄워 둔다 (worksheets.md C)
    yield


app = FastAPI(title="foldy", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
