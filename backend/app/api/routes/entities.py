import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.common import require_investigation
from app.db.session import get_db
from app.models.entity import Entity, Relationship
from app.models.evidence import Evidence
from app.schemas.entity import (
    EntityCreate,
    EntityList,
    EntityRead,
    RelationshipCreate,
    RelationshipList,
    RelationshipRead,
)

router = APIRouter()
relationship_router = APIRouter()


@router.get("", response_model=EntityList)
async def list_entities(
    investigation_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> EntityList:
    await require_investigation(db, investigation_id)
    condition = Entity.investigation_id == investigation_id
    total = await db.scalar(select(func.count()).select_from(Entity).where(condition))
    result = await db.scalars(
        select(Entity)
        .where(condition)
        .order_by(Entity.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return EntityList(items=list(result), total=total or 0, limit=limit, offset=offset)


@router.post("", response_model=EntityRead, status_code=status.HTTP_201_CREATED)
async def create_entity(payload: EntityCreate, db: AsyncSession = Depends(get_db)) -> Entity:
    await require_investigation(db, payload.investigation_id)
    entity = Entity(**payload.model_dump())
    db.add(entity)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Matching entity already exists in this investigation",
        ) from exc
    await db.refresh(entity)
    return entity


@router.get("/{entity_id}", response_model=EntityRead)
async def get_entity(entity_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Entity:
    entity = await db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")
    return entity


@relationship_router.get("", response_model=RelationshipList)
async def list_relationships(
    investigation_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> RelationshipList:
    await require_investigation(db, investigation_id)
    condition = Relationship.investigation_id == investigation_id
    total = await db.scalar(select(func.count()).select_from(Relationship).where(condition))
    result = await db.scalars(
        select(Relationship)
        .where(condition)
        .order_by(Relationship.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return RelationshipList(items=list(result), total=total or 0, limit=limit, offset=offset)


@relationship_router.post("", response_model=RelationshipRead, status_code=status.HTTP_201_CREATED)
async def create_relationship(
    payload: RelationshipCreate, db: AsyncSession = Depends(get_db)
) -> Relationship:
    await require_investigation(db, payload.investigation_id)
    subject = await db.get(Entity, payload.subject_entity_id)
    object_ = await db.get(Entity, payload.object_entity_id)
    if (
        not subject
        or not object_
        or subject.investigation_id != payload.investigation_id
        or object_.investigation_id != payload.investigation_id
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Both entities must belong to this investigation",
        )
    if payload.source_evidence_id:
        evidence = await db.get(Evidence, payload.source_evidence_id)
        if evidence is None or evidence.investigation_id != payload.investigation_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Evidence does not belong to this investigation",
            )
    relationship = Relationship(**payload.model_dump())
    db.add(relationship)
    await db.commit()
    await db.refresh(relationship)
    return relationship


@relationship_router.get("/{relationship_id}", response_model=RelationshipRead)
async def get_relationship(
    relationship_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> Relationship:
    relationship = await db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found")
    return relationship
