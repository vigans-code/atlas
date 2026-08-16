import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.investigation import (
    InvestigationPriority,
    InvestigationSensitivity,
    InvestigationStatus,
)


class InvestigationBase(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=10_000)
    objective: str = Field(default="", max_length=10_000)
    scope: str = Field(default="", max_length=10_000)
    reference: str | None = Field(default=None, max_length=80)
    priority: InvestigationPriority = InvestigationPriority.MEDIUM
    sensitivity: InvestigationSensitivity = InvestigationSensitivity.INTERNAL
    lead_analyst: str | None = Field(default=None, max_length=160)
    due_date: date | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)
    custom_fields: dict[str, object] = Field(default_factory=dict)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        cleaned = [tag.strip().lower() for tag in tags if tag.strip()]
        if any(len(tag) > 40 for tag in cleaned):
            raise ValueError("Tags cannot exceed 40 characters")
        return list(dict.fromkeys(cleaned))


class InvestigationCreate(InvestigationBase):
    status: InvestigationStatus = InvestigationStatus.DRAFT


class InvestigationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=10_000)
    objective: str | None = Field(default=None, max_length=10_000)
    scope: str | None = Field(default=None, max_length=10_000)
    reference: str | None = Field(default=None, max_length=80)
    status: InvestigationStatus | None = None
    priority: InvestigationPriority | None = None
    sensitivity: InvestigationSensitivity | None = None
    lead_analyst: str | None = Field(default=None, max_length=160)
    due_date: date | None = None
    tags: list[str] | None = Field(default=None, max_length=20)
    custom_fields: dict[str, object] | None = None

    @field_validator("tags")
    @classmethod
    def normalize_optional_tags(cls, tags: list[str] | None) -> list[str] | None:
        return InvestigationBase.normalize_tags(tags) if tags is not None else None


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
