import uuid
from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.models.source import SourceReliability, SourceType


class SourceCreate(BaseModel):
    investigation_id: uuid.UUID
    name: str = Field(min_length=2, max_length=240)
    url: str = Field(min_length=8, max_length=2048, pattern=r"^https://")
    provider: str | None = Field(default=None, max_length=160)
    source_type: SourceType = SourceType.WEBSITE
    reliability: SourceReliability = SourceReliability.UNKNOWN
    terms_notes: str = Field(default="", max_length=5000)
    metadata: dict[str, object] = Field(default_factory=dict)


class SourceRead(SourceCreate):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    metadata: dict[str, object] = Field(
        default_factory=dict, validation_alias=AliasChoices("metadata_", "metadata")
    )
    created_at: datetime
    updated_at: datetime


class SourceList(BaseModel):
    items: list[SourceRead]
    total: int
    limit: int
    offset: int
