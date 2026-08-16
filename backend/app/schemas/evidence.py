import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.evidence import EvidenceSensitivity, EvidenceStatus, EvidenceType


class EvidenceCreate(BaseModel):
    investigation_id: uuid.UUID
    source_id: uuid.UUID | None = None
    title: str = Field(min_length=2, max_length=240)
    evidence_type: EvidenceType
    status: EvidenceStatus = EvidenceStatus.CAPTURED
    sensitivity: EvidenceSensitivity = EvidenceSensitivity.INTERNAL
    source_url: str | None = Field(default=None, max_length=2048)
    collection_method: str = Field(default="manual", min_length=2, max_length=120)
    collected_by: str = Field(default="local analyst", min_length=2, max_length=160)
    collected_at: datetime | None = None
    sha256: str | None = None
    original_data: dict[str, object] = Field(default_factory=dict)
    parsed_data: dict[str, object] = Field(default_factory=dict)
    notes: str = Field(default="", max_length=20_000)
    tags: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("sha256")
    @classmethod
    def validate_sha256(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.lower().strip()
        if not re.fullmatch(r"[a-f0-9]{64}", normalized):
            raise ValueError("sha256 must contain exactly 64 hexadecimal characters")
        return normalized

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("https://"):
            raise ValueError("source_url must use HTTPS")
        return value

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        cleaned = [tag.strip().lower() for tag in tags if tag.strip()]
        if any(len(tag) > 40 for tag in cleaned):
            raise ValueError("Tags cannot exceed 40 characters")
        return list(dict.fromkeys(cleaned))


class EvidenceRead(EvidenceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    collected_at: datetime
    created_at: datetime
    updated_at: datetime


class EvidenceList(BaseModel):
    items: list[EvidenceRead]
    total: int
    limit: int
    offset: int
