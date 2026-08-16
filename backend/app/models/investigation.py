import uuid
from datetime import date
from enum import StrEnum

from sqlalchemy import Date, Enum, String, Text
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin


class InvestigationStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    REVIEW = "review"
    CLOSED = "closed"
    ARCHIVED = "archived"


class InvestigationPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InvestigationSensitivity(StrEnum):
    PUBLIC = "public"
    INTERNAL = "internal"
    SENSITIVE = "sensitive"
    RESTRICTED = "restricted"


class Investigation(TimestampMixin, Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    objective: Mapped[str] = mapped_column(Text, nullable=False, default="")
    scope: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reference: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    status: Mapped[InvestigationStatus] = mapped_column(
        Enum(InvestigationStatus, name="investigation_status", native_enum=False),
        nullable=False,
        default=InvestigationStatus.DRAFT,
        index=True,
    )
    priority: Mapped[InvestigationPriority] = mapped_column(
        Enum(InvestigationPriority, name="investigation_priority", native_enum=False),
        nullable=False,
        default=InvestigationPriority.MEDIUM,
    )
    sensitivity: Mapped[InvestigationSensitivity] = mapped_column(
        Enum(InvestigationSensitivity, name="investigation_sensitivity", native_enum=False),
        nullable=False,
        default=InvestigationSensitivity.INTERNAL,
        index=True,
    )
    lead_analyst: Mapped[str | None] = mapped_column(String(160), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSON),
        nullable=False,
        default=list,
    )
    custom_fields: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
