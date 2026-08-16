import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token
from app.models.project import Project, ProjectMembership, ProjectRole
from app.models.user import User


async def add_user(session: AsyncSession, email: str) -> User:
    user = User(email=email, display_name=email.split("@", 1)[0])
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def authorization(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def source_payload(**overrides: object) -> dict[str, object]:
    return {
        "source_type": "documentation",
        "name": "Atlas authentication guide",
        "canonical_url": "https://docs.example.org/authentication",
        "trust_level": "official",
        "language": "en",
        "metadata": {"topic": "security"},
        **overrides,
    }


async def test_knowledge_api_requires_a_valid_signed_principal(client: AsyncClient) -> None:
    missing = await client.get("/api/v1/knowledge/sources")
    tampered = await client.get(
        "/api/v1/knowledge/sources",
        headers={"Authorization": f"Bearer {uuid.uuid4()}.invalid"},
    )

    assert missing.status_code == 401
    assert tampered.status_code == 401
    assert missing.json()["detail"] == "Authentication required"


async def test_private_sources_are_filtered_before_retrieval(
    client: AsyncClient, session: AsyncSession
) -> None:
    owner = await add_user(session, "owner@example.org")
    stranger = await add_user(session, "stranger@example.org")

    created = await client.post(
        "/api/v1/knowledge/sources",
        headers=authorization(owner),
        json=source_payload(),
    )
    assert created.status_code == 201
    source_id = created.json()["id"]
    assert created.json()["scope"] == "user"
    assert created.json()["owner_user_id"] == str(owner.id)

    stranger_list = await client.get("/api/v1/knowledge/sources", headers=authorization(stranger))
    stranger_get = await client.get(
        f"/api/v1/knowledge/sources/{source_id}", headers=authorization(stranger)
    )

    assert stranger_list.status_code == 200
    assert stranger_list.json()["total"] == 0
    assert stranger_get.status_code == 404
    assert stranger_get.json()["detail"]["code"] == "knowledge_source_not_found"


async def test_deleted_sources_immediately_leave_the_searchable_scope(
    client: AsyncClient, session: AsyncSession
) -> None:
    owner = await add_user(session, "delete@example.org")
    created = await client.post(
        "/api/v1/knowledge/sources",
        headers=authorization(owner),
        json=source_payload(canonical_url="https://docs.example.org/delete-test"),
    )
    source_id = created.json()["id"]

    deleted = await client.delete(
        f"/api/v1/knowledge/sources/{source_id}", headers=authorization(owner)
    )
    after_delete = await client.get(
        f"/api/v1/knowledge/sources/{source_id}", headers=authorization(owner)
    )

    assert deleted.status_code == 204
    assert after_delete.status_code == 404


async def test_project_sources_require_membership_and_write_permission(
    client: AsyncClient, session: AsyncSession
) -> None:
    owner = await add_user(session, "project-owner@example.org")
    viewer = await add_user(session, "viewer@example.org")
    outsider = await add_user(session, "outsider@example.org")
    project = Project(owner_user_id=owner.id, name="Atlas")
    session.add(project)
    await session.flush()
    session.add(
        ProjectMembership(project_id=project.id, user_id=viewer.id, role=ProjectRole.VIEWER)
    )
    await session.commit()

    created = await client.post(
        "/api/v1/knowledge/sources",
        headers=authorization(owner),
        json=source_payload(
            project_id=str(project.id), canonical_url="https://docs.example.org/project"
        ),
    )
    assert created.status_code == 201
    assert created.json()["scope"] == "project"

    viewer_list = await client.get("/api/v1/knowledge/sources", headers=authorization(viewer))
    outsider_list = await client.get("/api/v1/knowledge/sources", headers=authorization(outsider))
    viewer_create = await client.post(
        "/api/v1/knowledge/sources",
        headers=authorization(viewer),
        json=source_payload(
            project_id=str(project.id), canonical_url="https://docs.example.org/viewer-write"
        ),
    )

    assert viewer_list.json()["total"] == 1
    assert outsider_list.json()["total"] == 0
    assert viewer_create.status_code == 403
    assert viewer_create.json()["detail"]["code"] == "knowledge_access_denied"


async def test_canonical_source_urls_must_be_https(
    client: AsyncClient, session: AsyncSession
) -> None:
    owner = await add_user(session, "url-check@example.org")

    response = await client.post(
        "/api/v1/knowledge/sources",
        headers=authorization(owner),
        json=source_payload(canonical_url="http://127.0.0.1/private"),
    )

    assert response.status_code == 422
