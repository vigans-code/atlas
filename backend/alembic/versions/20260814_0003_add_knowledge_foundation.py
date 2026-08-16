"""Add the authenticated Atlas knowledge foundation.

Revision ID: 20260814_0003
Revises: 20260809_0002
Create Date: 2026-08-14
"""

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260814_0003"
down_revision = "20260809_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(160), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"])
    op.create_index(op.f("ix_users_is_active"), "users", ["is_active"])

    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_projects_owner_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
    )
    op.create_index(op.f("ix_projects_name"), "projects", ["name"])
    op.create_index(op.f("ix_projects_owner_user_id"), "projects", ["owner_user_id"])

    op.create_table(
        "project_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("OWNER", "EDITOR", "VIEWER", name="project_role", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
            name=op.f("fk_project_memberships_project_id_projects"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_project_memberships_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_memberships")),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_memberships_project_user"),
    )
    op.create_index(
        op.f("ix_project_memberships_project_id"), "project_memberships", ["project_id"]
    )
    op.create_index(op.f("ix_project_memberships_role"), "project_memberships", ["role"])
    op.create_index(op.f("ix_project_memberships_user_id"), "project_memberships", ["user_id"])

    op.create_table(
        "knowledge_categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid()),
        sa.Column("slug", sa.String(160), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["knowledge_categories.id"],
            ondelete="SET NULL",
            name=op.f("fk_knowledge_categories_parent_id_knowledge_categories"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_categories")),
        sa.UniqueConstraint("slug", name=op.f("uq_knowledge_categories_slug")),
    )
    op.create_index(
        op.f("ix_knowledge_categories_parent_id"), "knowledge_categories", ["parent_id"]
    )
    op.create_index(op.f("ix_knowledge_categories_slug"), "knowledge_categories", ["slug"])

    op.create_table(
        "knowledge_sources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid()),
        sa.Column("project_id", sa.Uuid()),
        sa.Column(
            "scope",
            sa.Enum("GLOBAL", "USER", "PROJECT", name="knowledge_scope", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "source_type",
            sa.Enum(
                "CURATED",
                "FILE",
                "WEB",
                "DOCUMENTATION",
                "PROJECT",
                "API",
                name="knowledge_source_type",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("canonical_url", sa.String(2048)),
        sa.Column("provider", sa.String(160)),
        sa.Column(
            "trust_level",
            sa.Enum(
                "OFFICIAL",
                "HIGH",
                "MEDIUM",
                "LOW",
                "UNKNOWN",
                name="knowledge_trust_level",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("language", sa.String(35), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "refresh_schedule",
            sa.Enum(
                "MANUAL",
                "DAILY",
                "WEEKLY",
                "MONTHLY",
                name="knowledge_refresh_schedule",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("last_checked_at", sa.DateTime(timezone=True)),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "(scope = 'GLOBAL' AND owner_user_id IS NULL AND project_id IS NULL) OR "
            "(scope = 'USER' AND owner_user_id IS NOT NULL AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND owner_user_id IS NOT NULL AND project_id IS NOT NULL)",
            name=op.f("ck_knowledge_sources_knowledge_source_scope_owner"),
        ),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_sources_owner_user_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_sources_project_id_projects"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_sources")),
    )
    for column in (
        "enabled",
        "language",
        "name",
        "owner_user_id",
        "project_id",
        "scope",
        "source_type",
        "trust_level",
    ):
        op.create_index(op.f(f"ix_knowledge_sources_{column}"), "knowledge_sources", [column])
    op.create_index(
        "uq_knowledge_sources_user_url_active",
        "knowledge_sources",
        ["owner_user_id", "canonical_url"],
        unique=True,
        postgresql_where=sa.text(
            "scope = 'USER' AND canonical_url IS NOT NULL AND deleted_at IS NULL"
        ),
    )
    op.create_index(
        "uq_knowledge_sources_project_url_active",
        "knowledge_sources",
        ["project_id", "canonical_url"],
        unique=True,
        postgresql_where=sa.text(
            "scope = 'PROJECT' AND canonical_url IS NOT NULL AND deleted_at IS NULL"
        ),
    )

    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("document_type", sa.String(80), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "PROCESSING",
                "SEARCHABLE",
                "FAILED",
                "DISABLED",
                "DELETED",
                name="knowledge_document_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("language", sa.String(35), nullable=False),
        sa.Column("current_version_id", sa.Uuid()),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["source_id"],
            ["knowledge_sources.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_documents_source_id_knowledge_sources"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_documents")),
    )
    for column in (
        "current_version_id",
        "document_type",
        "language",
        "source_id",
        "status",
        "title",
    ):
        op.create_index(op.f(f"ix_knowledge_documents_{column}"), "knowledge_documents", [column])

    op.create_table(
        "knowledge_document_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("original_content_location", sa.String(2048)),
        sa.Column("normalized_content_location", sa.String(2048)),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("retrieved_at", sa.DateTime(timezone=True)),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("parser_version", sa.String(80), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["knowledge_documents.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_document_versions_document_id_knowledge_documents"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_document_versions")),
        sa.UniqueConstraint(
            "document_id", "content_hash", name="uq_knowledge_versions_document_content_hash"
        ),
        sa.UniqueConstraint(
            "document_id", "version", name="uq_knowledge_versions_document_version"
        ),
    )
    op.create_index(
        op.f("ix_knowledge_document_versions_content_hash"),
        "knowledge_document_versions",
        ["content_hash"],
    )
    op.create_index(
        op.f("ix_knowledge_document_versions_document_id"),
        "knowledge_document_versions",
        ["document_id"],
    )
    op.create_foreign_key(
        "fk_knowledge_documents_current_version",
        "knowledge_documents",
        "knowledge_document_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
        use_alter=True,
    )

    op.create_table(
        "knowledge_document_categories",
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["knowledge_categories.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_document_categories_category_id_knowledge_categories"),
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["knowledge_documents.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_document_categories_document_id_knowledge_documents"),
        ),
        sa.PrimaryKeyConstraint(
            "document_id", "category_id", name=op.f("pk_knowledge_document_categories")
        ),
    )

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_version_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("heading", sa.String(500)),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("start_offset", sa.Integer()),
        sa.Column("end_offset", sa.Integer()),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("search_vector", postgresql.TSVECTOR()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "token_count >= 0", name=op.f("ck_knowledge_chunks_knowledge_chunk_token_count")
        ),
        sa.ForeignKeyConstraint(
            ["document_version_id"],
            ["knowledge_document_versions.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_chunks_document_version_id_knowledge_document_versions"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_chunks")),
        sa.UniqueConstraint("document_version_id", "sequence", name="uq_knowledge_chunks_sequence"),
    )
    op.create_index(
        op.f("ix_knowledge_chunks_document_version_id"), "knowledge_chunks", ["document_version_id"]
    )
    op.create_index(
        "ix_knowledge_chunks_search_vector",
        "knowledge_chunks",
        ["search_vector"],
        postgresql_using="gin",
    )

    op.create_table(
        "knowledge_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chunk_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(120), nullable=False),
        sa.Column("embedding_model", sa.String(160), nullable=False),
        sa.Column("embedding_dimension", sa.Integer(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "embedding_dimension = 1536",
            name=op.f("ck_knowledge_embeddings_knowledge_embedding_dimension"),
        ),
        sa.ForeignKeyConstraint(
            ["chunk_id"],
            ["knowledge_chunks.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_embeddings_chunk_id_knowledge_chunks"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_embeddings")),
        sa.UniqueConstraint(
            "chunk_id", "provider", "embedding_model", name="uq_knowledge_embeddings_model"
        ),
    )
    op.create_index(op.f("ix_knowledge_embeddings_chunk_id"), "knowledge_embeddings", ["chunk_id"])
    op.create_index(
        "ix_knowledge_embeddings_hnsw_cosine",
        "knowledge_embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "knowledge_ingestion_jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid()),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "VALIDATING",
                "PARSING",
                "NORMALIZING",
                "CHUNKING",
                "EMBEDDING",
                "INDEXING",
                "COMPLETED",
                "FAILED",
                "CANCELLED",
                name="knowledge_ingestion_job_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("current_stage", sa.String(80), nullable=False),
        sa.Column("error_code", sa.String(120)),
        sa.Column("error_message", sa.String(500)),
        sa.Column("task_id", sa.String(160)),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "progress >= 0 AND progress <= 100",
            name=op.f("ck_knowledge_ingestion_jobs_knowledge_job_progress"),
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["knowledge_documents.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_ingestion_jobs_document_id_knowledge_documents"),
        ),
        sa.ForeignKeyConstraint(
            ["source_id"],
            ["knowledge_sources.id"],
            ondelete="CASCADE",
            name=op.f("fk_knowledge_ingestion_jobs_source_id_knowledge_sources"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_ingestion_jobs")),
        sa.UniqueConstraint("task_id", name=op.f("uq_knowledge_ingestion_jobs_task_id")),
    )
    for column in ("document_id", "source_id", "status"):
        op.create_index(
            op.f(f"ix_knowledge_ingestion_jobs_{column}"), "knowledge_ingestion_jobs", [column]
        )

    op.create_table(
        "knowledge_citations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("response_id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_id", sa.Uuid()),
        sa.Column("label", sa.String(32), nullable=False),
        sa.Column("source_name", sa.String(240), nullable=False),
        sa.Column("document_title", sa.String(500)),
        sa.Column("canonical_url", sa.String(2048)),
        sa.Column("excerpt", sa.Text()),
        sa.Column("locator", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["chunk_id"],
            ["knowledge_chunks.id"],
            ondelete="SET NULL",
            name=op.f("fk_knowledge_citations_chunk_id_knowledge_chunks"),
        ),
        sa.ForeignKeyConstraint(
            ["source_id"],
            ["knowledge_sources.id"],
            ondelete="RESTRICT",
            name=op.f("fk_knowledge_citations_source_id_knowledge_sources"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_citations")),
    )
    for column in ("chunk_id", "response_id", "source_id"):
        op.create_index(op.f(f"ix_knowledge_citations_{column}"), "knowledge_citations", [column])


def downgrade() -> None:
    op.drop_table("knowledge_citations")
    op.drop_table("knowledge_ingestion_jobs")
    op.drop_table("knowledge_embeddings")
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_document_categories")
    op.drop_constraint(
        "fk_knowledge_documents_current_version",
        "knowledge_documents",
        type_="foreignkey",
    )
    op.drop_table("knowledge_document_versions")
    op.drop_table("knowledge_documents")
    op.drop_table("knowledge_sources")
    op.drop_table("knowledge_categories")
    op.drop_table("project_memberships")
    op.drop_table("projects")
    op.drop_table("users")
