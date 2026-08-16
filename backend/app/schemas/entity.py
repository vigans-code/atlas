import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.entity import EntityType, RelationshipOrigin, VerificationState


class EntityCreate(BaseModel):
    investigation_id: uuid.UUID
    entity_type: EntityType
    display_name: str = Field(min_length=1, max_length=240)
    normalized_value: str = Field(min_length=1, max_length=512)
    aliases: list[str] = Field(default_factory=list, max_length=30)
    attributes: dict[str, object] = Field(default_factory=dict)
    verification_state: VerificationState = VerificationState.UNREVIEWED

    @field_validator("normalized_value")
    @classmethod
    def normalize_value(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def normalize_by_type(self) -> "EntityCreate":
        if self.entity_type in {
            EntityType.DOMAIN,
            EntityType.WEBSITE,
            EntityType.EMAIL,
            EntityType.IP_ADDRESS,
        }:
            self.normalized_value = self.normalized_value.lower()
        return self

    @field_validator("aliases")
    @classmethod
    def normalize_aliases(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))


class EntityRead(EntityCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class EntityList(BaseModel):
    items: list[EntityRead]
    total: int
    limit: int
    offset: int


class RelationshipCreate(BaseModel):
    investigation_id: uuid.UUID
    subject_entity_id: uuid.UUID
    object_entity_id: uuid.UUID
    relationship_type: str = Field(min_length=2, max_length=80)
    origin: RelationshipOrigin = RelationshipOrigin.MANUAL
    verification_state: VerificationState = VerificationState.UNREVIEWED
    confidence: int | None = Field(default=None, ge=0, le=100)
    rationale: str = Field(default="", max_length=10_000)
    source_evidence_id: uuid.UUID | None = None
    valid_from: datetime | None = None
    valid_to: datetime | None = None

    @field_validator("relationship_type")
    @classmethod
    def normalize_relationship_type(cls, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")
        if len(normalized) < 2:
            raise ValueError("relationship_type must contain a descriptive value")
        return normalized

    @model_validator(mode="after")
    def validate_relationship(self) -> "RelationshipCreate":
        if self.subject_entity_id == self.object_entity_id:
            raise ValueError("A relationship must connect two different entities")
        if self.valid_from and self.valid_to and self.valid_to < self.valid_from:
            raise ValueError("valid_to cannot be earlier than valid_from")
        return self


class RelationshipRead(RelationshipCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class RelationshipList(BaseModel):
    items: list[RelationshipRead]
    total: int
    limit: int
    offset: int
