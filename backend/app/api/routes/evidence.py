import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.common import require_investigation
from app.db.session import get_db
from app.models.evidence import Evidence
from app.models.source import Source
from app.schemas.evidence import EvidenceCreate, EvidenceList, EvidenceRead

router = APIRouter()


@router.get("", response_model=EvidenceList)
async def list_evidence(
    investigation_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> EvidenceList:
    await require_investigation(db, investigation_id)
    condition = Evidence.investigation_id == investigation_id
    total = await db.scalar(select(func.count()).select_from(Evidence).where(condition))
    result = await db.scalars(
        select(Evidence)
        .where(condition)
        .order_by(Evidence.collected_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return EvidenceList(items=list(result), total=total or 0, limit=limit, offset=offset)


@router.post("", response_model=EvidenceRead, status_code=status.HTTP_201_CREATED)
async def create_evidence(payload: EvidenceCreate, db: AsyncSession = Depends(get_db)) -> Evidence:
    await require_investigation(db, payload.investigation_id)
    if payload.source_id:
        source = await db.get(Source, payload.source_id)
        if source is None or source.investigation_id != payload.investigation_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Source does not belong to this investigation",
            )
    values = payload.model_dump()
    if values["collected_at"] is None:
        values["collected_at"] = datetime.now(UTC)
    evidence = Evidence(**values)
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    return evidence


@router.get("/{evidence_id}", response_model=EvidenceRead)
async def get_evidence(evidence_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Evidence:
    evidence = await db.get(Evidence, evidence_id)
    if evidence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    return evidence
