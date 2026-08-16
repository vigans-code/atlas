import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def test_register_me_and_logout(client: AsyncClient) -> None:
    registered = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "analyst@example.test",
            "display_name": "Atlas Analyst",
            "password": "a-strong-local-password",
        },
    )
    assert registered.status_code == 201
    token = registered.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile = await client.get("/api/v1/auth/me", headers=headers)
    assert profile.status_code == 200
    assert profile.json()["email"] == "analyst@example.test"

    sessions = await client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions.status_code == 200
    assert len(sessions.json()) == 1
    assert sessions.json()[0]["current"] is True

    logged_out = await client.post("/api/v1/auth/logout", headers=headers)
    assert logged_out.status_code == 204
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401


async def test_login_rejects_bad_password(client: AsyncClient, session: AsyncSession) -> None:
    session.add(User(id=uuid.uuid4(), email="legacy@example.test", display_name="Legacy"))
    await session.commit()
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "legacy@example.test", "password": "not-the-password"},
    )
    assert response.status_code == 401


async def test_duplicate_registration_is_generic(client: AsyncClient) -> None:
    payload = {
        "email": "duplicate@example.test",
        "display_name": "First",
        "password": "a-strong-local-password",
    }
    assert (await client.post("/api/v1/auth/register", json=payload)).status_code == 201
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "account_exists"
