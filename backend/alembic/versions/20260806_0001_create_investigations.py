"""Create investigations table.

Revision ID: 20260806_0001
Revises:
Create Date: 2026-08-06
"""

import sqlalchemy as sa

from alembic import op

revision = "20260806_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "investigations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT",
                "ACTIVE",
                "REVIEW",
                "CLOSED",
                "ARCHIVED",
                name="investigation_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
                name="investigation_priority",
                native_enum=False,
            ),
            nullable=False,
        ),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_investigations")),
    )
    op.create_index(op.f("ix_investigations_status"), "investigations", ["status"])
    op.create_index(op.f("ix_investigations_title"), "investigations", ["title"])


def downgrade() -> None:
    op.drop_index(op.f("ix_investigations_title"), table_name="investigations")
    op.drop_index(op.f("ix_investigations_status"), table_name="investigations")
    op.drop_table("investigations")
