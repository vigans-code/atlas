import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.investigation import InvestigationPriority, InvestigationStatus


class InvestigationBase(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=10_000)
    priority: InvestigationPriority = InvestigationPriority.MEDIUM
    tags: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        cleaned = [tag.strip().lower() for tag in tags if tag.strip()]
        if any(len(tag) > 40 for tag in cleaned):
            raise ValueError("Tags cannot exceed 40 characters")
        return list(dict.fromkeys(cleaned))


class InvestigationCreate(InvestigationBase):
    status: InvestigationStatus = InvestigationStatus.DRAFT


class InvestigationRead(InvestigationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: InvestigationStatus
    created_at: datetime
    updated_at: datetime


class InvestigationList(BaseModel):
    items: list[InvestigationRead]
    total: int
    limit: int
    offset: int


class InvestigationSummary(BaseModel):
    total: int
    active: int
    review: int
    closed: int

