import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeScope, KnowledgeSource
from app.models.project import Project, ProjectMembership, ProjectRole
from app.schemas.knowledge import KnowledgeSourceCreate


class KnowledgeSourceRepository:
    """All source reads begin with an authorization predicate at query time."""

    def __init__(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        self.db = db
        self.user_id = user_id

    async def list(self, *, limit: int, offset: int) -> tuple[list[KnowledgeSource], int]:
        access = self._read_access()
        total = await self.db.scalar(
            select(func.count()).select_from(KnowledgeSource).where(access)
        )
        sources = await self.db.scalars(
            select(KnowledgeSource)
            .where(access)
            .order_by(KnowledgeSource.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(sources), total or 0

    async def get(self, source_id: uuid.UUID) -> KnowledgeSource | None:
        return await self.db.scalar(
            select(KnowledgeSource).where(
                KnowledgeSource.id == source_id,
                self._read_access(),
            )
        )

    async def create(self, payload: KnowledgeSourceCreate) -> KnowledgeSource:
        scope = KnowledgeScope.USER
        if payload.project_id is not None:
            if not await self._can_write_project(payload.project_id):
                raise KnowledgeAccessDeniedError
            scope = KnowledgeScope.PROJECT
        values = payload.model_dump()
        values["metadata_"] = values.pop("metadata")
        source = KnowledgeSource(owner_user_id=self.user_id, scope=scope, **values)
        self.db.add(source)
        await self.db.commit()
        await self.db.refresh(source)
        return source

    async def soft_delete(self, source: KnowledgeSource) -> None:
        if source.owner_user_id != self.user_id:
            raise KnowledgeAccessDeniedError
        if source.project_id is not None and not await self._can_write_project(source.project_id):
            raise KnowledgeAccessDeniedError
        source.enabled = False
        source.deleted_at = datetime.now(UTC)
        await self.db.commit()

    def _read_access(self) -> object:
        project_access = select(Project.id).where(
            Project.archived_at.is_(None),
            or_(
                Project.owner_user_id == self.user_id,
                exists(
                    select(ProjectMembership.id).where(
                        ProjectMembership.project_id == Project.id,
                        ProjectMembership.user_id == self.user_id,
                    )
                ),
            ),
        )
        return and_(
            KnowledgeSource.deleted_at.is_(None),
            KnowledgeSource.enabled.is_(True),
            or_(
                KnowledgeSource.scope == KnowledgeScope.GLOBAL,
                and_(
                    KnowledgeSource.scope == KnowledgeScope.USER,
                    KnowledgeSource.owner_user_id == self.user_id,
                ),
                and_(
                    KnowledgeSource.scope == KnowledgeScope.PROJECT,
                    KnowledgeSource.project_id.in_(project_access),
                ),
            ),
        )

    async def _can_write_project(self, project_id: uuid.UUID) -> bool:
        statement: Select[tuple[uuid.UUID]] = select(Project.id).where(
            Project.id == project_id,
            Project.archived_at.is_(None),
            or_(
                Project.owner_user_id == self.user_id,
                exists(
                    select(ProjectMembership.id).where(
                        ProjectMembership.project_id == Project.id,
                        ProjectMembership.user_id == self.user_id,
                        ProjectMembership.role.in_([ProjectRole.OWNER, ProjectRole.EDITOR]),
                    )
                ),
            ),
        )
        return await self.db.scalar(statement) is not None


class KnowledgeAccessDeniedError(PermissionError):
    pass
