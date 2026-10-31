import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

# Vite 개발 서버. 휴대폰에서 PC 주소로 열면 .env 의 CORS_ORIGINS 에 그 주소를 더한다 (docs/specs/mobile.md)
ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"] + [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()
]

app = FastAPI(title="foldy")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
