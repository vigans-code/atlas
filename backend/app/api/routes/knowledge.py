import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, require_principal
from app.db.session import get_db
from app.knowledge.repository import KnowledgeAccessDeniedError, KnowledgeSourceRepository
from app.models.knowledge import KnowledgeSource
from app.schemas.knowledge import KnowledgeSourceCreate, KnowledgeSourceList, KnowledgeSourceRead

router = APIRouter()


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "knowledge_source_not_found",
            "message": "Knowledge source not found",
        },
    )


@router.get("/sources", response_model=KnowledgeSourceList)
async def list_knowledge_sources(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeSourceList:
    sources, total = await KnowledgeSourceRepository(db, principal.user_id).list(
        limit=limit, offset=offset
    )
    return KnowledgeSourceList(
        items=[KnowledgeSourceRead.model_validate(source) for source in sources],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/sources", response_model=KnowledgeSourceRead, status_code=status.HTTP_201_CREATED)
async def create_knowledge_source(
    payload: KnowledgeSourceCreate,
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeSource:
    try:
        return await KnowledgeSourceRepository(db, principal.user_id).create(payload)
    except KnowledgeAccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "knowledge_access_denied", "message": "Project access denied"},
        ) from exc


@router.get("/sources/{source_id}", response_model=KnowledgeSourceRead)
async def get_knowledge_source(
    source_id: uuid.UUID,
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeSource:
    source = await KnowledgeSourceRepository(db, principal.user_id).get(source_id)
    if source is None:
        raise _not_found()
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_source(
    source_id: uuid.UUID,
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> Response:
    repository = KnowledgeSourceRepository(db, principal.user_id)
    source = await repository.get(source_id)
    if source is None:
        raise _not_found()
    try:
        await repository.soft_delete(source)
    except KnowledgeAccessDeniedError as exc:
        raise _not_found() from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
