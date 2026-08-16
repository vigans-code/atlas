import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin


class EntityType(StrEnum):
    PERSON = "person"
    USERNAME = "username"
    EMAIL = "email"
    PHONE = "phone"
    DOMAIN = "domain"
    WEBSITE = "website"
    IP_ADDRESS = "ip_address"
    ORGANIZATION = "organization"
    SOCIAL_PROFILE = "social_profile"
    LOCATION = "location"
    CRYPTOCURRENCY_ADDRESS = "cryptocurrency_address"
    FILE = "file"
    DEVICE_IDENTIFIER = "device_identifier"
    ACCOUNT = "account"
    CERTIFICATE = "certificate"
    OTHER = "other"


class VerificationState(StrEnum):
    UNREVIEWED = "unreviewed"
    SUPPORTED = "supported"
    VERIFIED = "verified"
    DISPUTED = "disputed"
    REJECTED = "rejected"


class Entity(TimestampMixin, Base):
    __tablename__ = "entities"
    __table_args__ = (
        UniqueConstraint(
            "investigation_id",
            "entity_type",
            "normalized_value",
            name="uq_entities_investigation_type_value",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entity_type: Mapped[EntityType] = mapped_column(
        Enum(EntityType, name="entity_type", native_enum=False), nullable=False, index=True
    )
    display_name: Mapped[str] = mapped_column(String(240), nullable=False)
    normalized_value: Mapped[str] = mapped_column(String(512), nullable=False)
    aliases: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSON), nullable=False, default=list
    )
    attributes: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    verification_state: Mapped[VerificationState] = mapped_column(
        Enum(VerificationState, name="verification_state", native_enum=False),
        nullable=False,
        default=VerificationState.UNREVIEWED,
    )


class EntityMention(TimestampMixin, Base):
    __tablename__ = "entity_mentions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True
    )
    excerpt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    extraction_method: Mapped[str] = mapped_column(String(80), nullable=False, default="manual")
    confidence: Mapped[int | None] = mapped_column(nullable=True)
    analyst_confirmed: Mapped[bool] = mapped_column(nullable=False, default=False)


class RelationshipOrigin(StrEnum):
    MANUAL = "manual"
    IMPORTED = "imported"
    RULE_SUGGESTED = "rule_suggested"
    AI_SUGGESTED = "ai_suggested"


class Relationship(TimestampMixin, Base):
    __tablename__ = "relationships"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_entity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    object_entity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    origin: Mapped[RelationshipOrigin] = mapped_column(
        Enum(RelationshipOrigin, name="relationship_origin", native_enum=False),
        nullable=False,
        default=RelationshipOrigin.MANUAL,
    )
    verification_state: Mapped[VerificationState] = mapped_column(
        Enum(VerificationState, name="relationship_verification_state", native_enum=False),
        nullable=False,
        default=VerificationState.UNREVIEWED,
    )
    confidence: Mapped[int | None] = mapped_column(nullable=True)
    rationale: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_evidence_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True
    )
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
