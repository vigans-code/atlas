from fastapi import APIRouter

from app.api.routes import health, investigations

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(
    investigations.router,
    prefix="/investigations",
    tags=["investigations"],
)

