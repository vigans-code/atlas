from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


class LiveStatus(BaseModel):
    status: Literal["online"] = "online"
    service: str = settings.app_name
    version: str = settings.app_version


class ReadyStatus(LiveStatus):
    database: Literal["online"] = "online"
    cache: Literal["online"] = "online"


@router.get("/live", response_model=LiveStatus)
async def live() -> LiveStatus:
    return LiveStatus()


@router.get(
    "/ready",
    response_model=ReadyStatus,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "A dependency is unavailable"}},
)
async def ready(db: AsyncSession = Depends(get_db)) -> ReadyStatus:
    cache = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        await db.execute(text("SELECT 1"))
        await cache.ping()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="One or more required services are unavailable",
        ) from exc
    finally:
        await cache.aclose()
    return ReadyStatus()
