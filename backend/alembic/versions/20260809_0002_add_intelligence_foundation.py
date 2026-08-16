"""Add investigation intelligence foundation.

Revision ID: 20260809_0002
Revises: 20260806_0001
Create Date: 2026-08-09
"""

import sqlalchemy as sa

from alembic import op

revision = "20260809_0002"
down_revision = "20260806_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "investigations", sa.Column("objective", sa.Text(), server_default="", nullable=False)
    )
    op.add_column(
        "investigations", sa.Column("scope", sa.Text(), server_default="", nullable=False)
    )
    op.add_column("investigations", sa.Column("reference", sa.String(length=80)))
    op.add_column(
        "investigations",
        sa.Column(
            "sensitivity",
            sa.Enum(
                "PUBLIC",
                "INTERNAL",
                "SENSITIVE",
                "RESTRICTED",
                name="investigation_sensitivity",
                native_enum=False,
            ),
            server_default="INTERNAL",
            nullable=False,
        ),
    )
    op.add_column("investigations", sa.Column("lead_analyst", sa.String(length=160)))
    op.add_column("investigations", sa.Column("due_date", sa.Date()))
    op.add_column(
        "investigations", sa.Column("custom_fields", sa.JSON(), server_default="{}", nullable=False)
    )
    op.create_index(op.f("ix_investigations_reference"), "investigations", ["reference"])
    op.create_index(op.f("ix_investigations_sensitivity"), "investigations", ["sensitivity"])

    op.create_table(
        "sources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("investigation_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("provider", sa.String(length=160)),
        sa.Column(
            "source_type",
            sa.Enum(
                "WEBSITE",
                "API",
                "DOCUMENT",
                "PUBLIC_RECORD",
                "USER_PROVIDED",
                "OTHER",
                name="source_type",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "reliability",
            sa.Enum(
                "UNKNOWN",
                "LOW",
                "MIXED",
                "RELIABLE",
                name="source_reliability",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("terms_notes", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sources")),
        sa.UniqueConstraint("investigation_id", "url", name="uq_sources_investigation_url"),
    )
    op.create_index(op.f("ix_sources_investigation_id"), "sources", ["investigation_id"])

    op.create_table(
        "evidence",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("investigation_id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid()),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column(
            "evidence_type",
            sa.Enum(
                "URL",
                "TEXT",
                "SCREENSHOT",
                "FILE",
                "IMAGE",
                "DOMAIN",
                "IP_ADDRESS",
                "EMAIL",
                "USERNAME",
                "DNS_RECORD",
                "WHOIS_RECORD",
                "CERTIFICATE",
                "SEARCH_RESULT",
                "OBSERVATION",
                "OTHER",
                name="evidence_type",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "CAPTURED",
                "PROCESSING",
                "READY",
                "QUARANTINED",
                "FAILED",
                "SUPERSEDED",
                name="evidence_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "sensitivity",
            sa.Enum(
                "PUBLIC",
                "INTERNAL",
                "SENSITIVE",
                "RESTRICTED",
                name="evidence_sensitivity",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("source_url", sa.String(length=2048)),
        sa.Column("collection_method", sa.String(length=120), nullable=False),
        sa.Column("collected_by", sa.String(length=160), nullable=False),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sha256", sa.String(length=64)),
        sa.Column("original_data", sa.JSON(), nullable=False),
        sa.Column("parsed_data", sa.JSON(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_evidence")),
    )
    for column in ("investigation_id", "source_id", "status", "collected_at", "sha256"):
        op.create_index(op.f(f"ix_evidence_{column}"), "evidence", [column])

    op.create_table(
        "entities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("investigation_id", sa.Uuid(), nullable=False),
        sa.Column(
            "entity_type",
            sa.Enum(
                "PERSON",
                "USERNAME",
                "EMAIL",
                "PHONE",
                "DOMAIN",
                "WEBSITE",
                "IP_ADDRESS",
                "ORGANIZATION",
                "SOCIAL_PROFILE",
                "LOCATION",
                "CRYPTOCURRENCY_ADDRESS",
                "FILE",
                "DEVICE_IDENTIFIER",
                "ACCOUNT",
                "CERTIFICATE",
                "OTHER",
                name="entity_type",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("display_name", sa.String(length=240), nullable=False),
        sa.Column("normalized_value", sa.String(length=512), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=False),
        sa.Column("attributes", sa.JSON(), nullable=False),
        sa.Column(
            "verification_state",
            sa.Enum(
                "UNREVIEWED",
                "SUPPORTED",
                "VERIFIED",
                "DISPUTED",
                "REJECTED",
                name="verification_state",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_entities")),
        sa.UniqueConstraint(
            "investigation_id",
            "entity_type",
            "normalized_value",
            name="uq_entities_investigation_type_value",
        ),
    )
    op.create_index(op.f("ix_entities_investigation_id"), "entities", ["investigation_id"])
    op.create_index(op.f("ix_entities_entity_type"), "entities", ["entity_type"])

    op.create_table(
        "entity_mentions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("evidence_id", sa.Uuid(), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("extraction_method", sa.String(length=80), nullable=False),
        sa.Column("confidence", sa.Integer()),
        sa.Column("analyst_confirmed", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["entity_id"], ["entities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_entity_mentions")),
    )
    op.create_index(op.f("ix_entity_mentions_entity_id"), "entity_mentions", ["entity_id"])
    op.create_index(op.f("ix_entity_mentions_evidence_id"), "entity_mentions", ["evidence_id"])

    op.create_table(
        "relationships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("investigation_id", sa.Uuid(), nullable=False),
        sa.Column("subject_entity_id", sa.Uuid(), nullable=False),
        sa.Column("object_entity_id", sa.Uuid(), nullable=False),
        sa.Column("relationship_type", sa.String(length=80), nullable=False),
        sa.Column(
            "origin",
            sa.Enum(
                "MANUAL",
                "IMPORTED",
                "RULE_SUGGESTED",
                "AI_SUGGESTED",
                name="relationship_origin",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "verification_state",
            sa.Enum(
                "UNREVIEWED",
                "SUPPORTED",
                "VERIFIED",
                "DISPUTED",
                "REJECTED",
                name="relationship_verification_state",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("confidence", sa.Integer()),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("source_evidence_id", sa.Uuid()),
        sa.Column("valid_from", sa.DateTime(timezone=True)),
        sa.Column("valid_to", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["object_entity_id"], ["entities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_evidence_id"], ["evidence.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subject_entity_id"], ["entities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_relationships")),
    )
    for column in (
        "investigation_id",
        "subject_entity_id",
        "object_entity_id",
        "relationship_type",
    ):
        op.create_index(op.f(f"ix_relationships_{column}"), "relationships", [column])


def downgrade() -> None:
    op.drop_table("relationships")
    op.drop_table("entity_mentions")
    op.drop_table("entities")
    op.drop_table("evidence")
    op.drop_table("sources")
    op.drop_index(op.f("ix_investigations_sensitivity"), table_name="investigations")
    op.drop_index(op.f("ix_investigations_reference"), table_name="investigations")
    for column in (
        "custom_fields",
        "due_date",
        "lead_analyst",
        "sensitivity",
        "reference",
        "scope",
        "objective",
    ):
        op.drop_column("investigations", column)
