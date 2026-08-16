import json
import uuid
from datetime import datetime
from urllib.parse import urlsplit

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from app.models.knowledge import (
    KnowledgeScope,
    KnowledgeSourceType,
    KnowledgeTrustLevel,
    RefreshSchedule,
)


class KnowledgeSourceCreate(BaseModel):
    project_id: uuid.UUID | None = None
    source_type: KnowledgeSourceType
    name: str = Field(min_length=2, max_length=240)
    canonical_url: str | None = Field(default=None, max_length=2048)
    provider: str | None = Field(default=None, max_length=160)
    trust_level: KnowledgeTrustLevel = KnowledgeTrustLevel.UNKNOWN
    language: str = Field(default="und", min_length=2, max_length=35, pattern=r"^[A-Za-z0-9-]+$")
    refresh_schedule: RefreshSchedule = RefreshSchedule.MANUAL
    metadata: dict[str, object] = Field(default_factory=dict)

    @field_validator("canonical_url")
    @classmethod
    def validate_canonical_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Canonical URLs must be public HTTPS URLs without credentials")
        return parsed.geturl()

    @field_validator("metadata")
    @classmethod
    def bound_metadata(cls, value: dict[str, object]) -> dict[str, object]:
        if len(json.dumps(value, separators=(",", ":"), default=str).encode()) > 16_384:
            raise ValueError("Metadata exceeds 16 KB")
        return value


class KnowledgeSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID | None
    project_id: uuid.UUID | None
    scope: KnowledgeScope
    source_type: KnowledgeSourceType
    name: str
    canonical_url: str | None
    provider: str | None
    trust_level: KnowledgeTrustLevel
    language: str
    enabled: bool
    refresh_schedule: RefreshSchedule
    last_checked_at: datetime | None
    metadata: dict[str, object] = Field(
        default_factory=dict, validation_alias=AliasChoices("metadata_", "metadata")
    )
    created_at: datetime
    updated_at: datetime


class KnowledgeSourceList(BaseModel):
    items: list[KnowledgeSourceRead]
    total: int
    limit: int
    offset: int
