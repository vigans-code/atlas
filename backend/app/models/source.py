import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin


class SourceType(StrEnum):
    WEBSITE = "website"
    API = "api"
    DOCUMENT = "document"
    PUBLIC_RECORD = "public_record"
    USER_PROVIDED = "user_provided"
    OTHER = "other"


class SourceReliability(StrEnum):
    UNKNOWN = "unknown"
    LOW = "low"
    MIXED = "mixed"
    RELIABLE = "reliable"


class Source(TimestampMixin, Base):
    __tablename__ = "sources"
    __table_args__ = (
        UniqueConstraint("investigation_id", "url", name="uq_sources_investigation_url"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type", native_enum=False),
        nullable=False,
        default=SourceType.WEBSITE,
    )
    reliability: Mapped[SourceReliability] = mapped_column(
        Enum(SourceReliability, name="source_reliability", native_enum=False),
        nullable=False,
        default=SourceReliability.UNKNOWN,
    )
    terms_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    metadata_: Mapped[dict[str, object]] = mapped_column(
        "metadata", JSON, nullable=False, default=dict
    )
