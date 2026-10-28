"""Reuse the existing FastAPI service in the combined Vercel preview."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api-v1"))
from app.main import app

from fastapi import Request

@app.middleware("http")
async def branded_api_path(request: Request, call_next):
    prefix = "/strategic-plan/demo"
    if request.scope["path"].startswith(prefix + "/api/v1/"):
        request.scope["path"] = request.scope["path"][len(prefix):]
        request.scope["raw_path"] = request.scope["path"].encode()
    return await call_next(request)
