from fastapi import APIRouter

from app.api.routes import auth, entities, evidence, health, investigations, knowledge, sources
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
if settings.enable_legacy_api:
    api_router.include_router(
        investigations.router,
        prefix="/investigations",
        tags=["investigations"],
        deprecated=True,
    )
    api_router.include_router(sources.router, prefix="/sources", tags=["sources"], deprecated=True)
    api_router.include_router(
        evidence.router, prefix="/evidence", tags=["evidence"], deprecated=True
    )
    api_router.include_router(
        entities.router, prefix="/entities", tags=["entities"], deprecated=True
    )
    api_router.include_router(
        entities.relationship_router,
        prefix="/relationships",
        tags=["relationships"],
        deprecated=True,
    )
