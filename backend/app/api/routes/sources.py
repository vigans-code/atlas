import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.common import require_investigation
from app.db.session import get_db
from app.models.source import Source
from app.schemas.source import SourceCreate, SourceList, SourceRead

router = APIRouter()


@router.get("", response_model=SourceList)
async def list_sources(
    investigation_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> SourceList:
    await require_investigation(db, investigation_id)
    condition = Source.investigation_id == investigation_id
    total = await db.scalar(select(func.count()).select_from(Source).where(condition))
    result = await db.scalars(
        select(Source)
        .where(condition)
        .order_by(Source.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return SourceList(
        items=[SourceRead.model_validate(item) for item in result],
        total=total or 0,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
async def create_source(payload: SourceCreate, db: AsyncSession = Depends(get_db)) -> Source:
    await require_investigation(db, payload.investigation_id)
    values = payload.model_dump()
    values["metadata_"] = values.pop("metadata")
    source = Source(**values)
    db.add(source)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Source URL already exists in this investigation",
        ) from exc
    await db.refresh(source)
    return source


@router.get("/{source_id}", response_model=SourceRead)
async def get_source(source_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Source:
    source = await db.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return source
