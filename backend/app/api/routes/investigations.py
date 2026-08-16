import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.investigation import Investigation, InvestigationStatus
from app.schemas.investigation import (
    InvestigationCreate,
    InvestigationList,
    InvestigationRead,
    InvestigationSummary,
    InvestigationUpdate,
)

router = APIRouter()


@router.get("", response_model=InvestigationList)
async def list_investigations(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> InvestigationList:
    total = await db.scalar(select(func.count()).select_from(Investigation))
    result = await db.scalars(
        select(Investigation).order_by(Investigation.updated_at.desc()).limit(limit).offset(offset)
    )
    return InvestigationList(
        items=list(result),
        total=total or 0,
        limit=limit,
        offset=offset,
    )


@router.get("/summary", response_model=InvestigationSummary)
async def investigation_summary(db: AsyncSession = Depends(get_db)) -> InvestigationSummary:
    rows = await db.execute(
        select(
            func.count(Investigation.id),
            func.count(Investigation.id).filter(Investigation.status == InvestigationStatus.ACTIVE),
            func.count(Investigation.id).filter(Investigation.status == InvestigationStatus.REVIEW),
            func.count(Investigation.id).filter(Investigation.status == InvestigationStatus.CLOSED),
        )
    )
    total, active, review, closed = rows.one()
    return InvestigationSummary(total=total, active=active, review=review, closed=closed)


@router.post("", response_model=InvestigationRead, status_code=status.HTTP_201_CREATED)
async def create_investigation(
    payload: InvestigationCreate,
    db: AsyncSession = Depends(get_db),
) -> Investigation:
    investigation = Investigation(**payload.model_dump())
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    return investigation


@router.get("/{investigation_id}", response_model=InvestigationRead)
async def get_investigation(
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Investigation:
    investigation = await db.get(Investigation, investigation_id)
    if investigation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    return investigation


@router.patch("/{investigation_id}", response_model=InvestigationRead)
async def update_investigation(
    investigation_id: uuid.UUID,
    payload: InvestigationUpdate,
    db: AsyncSession = Depends(get_db),
) -> Investigation:
    investigation = await db.get(Investigation, investigation_id)
    if investigation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(investigation, field, value)
    await db.commit()
    await db.refresh(investigation)
    return investigation
