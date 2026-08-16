import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin


class EvidenceType(StrEnum):
    URL = "url"
    TEXT = "text"
    SCREENSHOT = "screenshot"
    FILE = "file"
    IMAGE = "image"
    DOMAIN = "domain"
    IP_ADDRESS = "ip_address"
    EMAIL = "email"
    USERNAME = "username"
    DNS_RECORD = "dns_record"
    WHOIS_RECORD = "whois_record"
    CERTIFICATE = "certificate"
    SEARCH_RESULT = "search_result"
    OBSERVATION = "observation"
    OTHER = "other"


class EvidenceStatus(StrEnum):
    CAPTURED = "captured"
    PROCESSING = "processing"
    READY = "ready"
    QUARANTINED = "quarantined"
    FAILED = "failed"
    SUPERSEDED = "superseded"


class EvidenceSensitivity(StrEnum):
    PUBLIC = "public"
    INTERNAL = "internal"
    SENSITIVE = "sensitive"
    RESTRICTED = "restricted"


class Evidence(TimestampMixin, Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sources.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    evidence_type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType, name="evidence_type", native_enum=False), nullable=False
    )
    status: Mapped[EvidenceStatus] = mapped_column(
        Enum(EvidenceStatus, name="evidence_status", native_enum=False),
        nullable=False,
        default=EvidenceStatus.CAPTURED,
        index=True,
    )
    sensitivity: Mapped[EvidenceSensitivity] = mapped_column(
        Enum(EvidenceSensitivity, name="evidence_sensitivity", native_enum=False),
        nullable=False,
        default=EvidenceSensitivity.INTERNAL,
    )
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    collection_method: Mapped[str] = mapped_column(String(120), nullable=False, default="manual")
    collected_by: Mapped[str] = mapped_column(String(160), nullable=False, default="local analyst")
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), index=True
    )
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    original_data: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    parsed_data: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSON), nullable=False, default=list
    )
