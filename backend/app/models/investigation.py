import uuid
from enum import StrEnum

from sqlalchemy import Enum, String, Text
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


class Investigation(TimestampMixin, Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
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
    tags: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSON),
        nullable=False,
        default=list,
    )
