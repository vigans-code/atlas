from httpx import AsyncClient


async def test_create_and_list_investigation(client: AsyncClient) -> None:
    create_response = await client.post(
        "/api/v1/investigations",
        json={
            "title": "Authorized domain review",
            "description": "Review public exposure within the approved scope.",
            "status": "active",
            "priority": "high",
            "tags": ["Example.com", " exposure ", "exposure"],
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Authorized domain review"
    assert created["status"] == "active"
    assert created["tags"] == ["example.com", "exposure"]

    list_response = await client.get("/api/v1/investigations")
    assert list_response.status_code == 200
    body = list_response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == created["id"]

    summary_response = await client.get("/api/v1/investigations/summary")
    assert summary_response.status_code == 200
    assert summary_response.json() == {"total": 1, "active": 1, "review": 0, "closed": 0}


async def test_rejects_invalid_investigation(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/investigations",
        json={"title": "x", "description": "", "tags": []},
    )

    assert response.status_code == 422


async def test_missing_investigation_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/investigations/9af7be83-2068-42a5-9634-ea061a0b70f6")

    assert response.status_code == 404
    assert response.json()["detail"] == "Investigation not found"

