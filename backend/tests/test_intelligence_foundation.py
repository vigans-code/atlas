from httpx import AsyncClient


async def create_investigation(client: AsyncClient, title: str = "Authorized review") -> str:
    response = await client.post(
        "/api/v1/investigations",
        json={"title": title, "status": "active", "scope": "Public and authorized sources only"},
    )
    assert response.status_code == 201
    return response.json()["id"]


async def test_collection_to_relationship_workflow(client: AsyncClient) -> None:
    investigation_id = await create_investigation(client)

    source_response = await client.post(
        "/api/v1/sources",
        json={
            "investigation_id": investigation_id,
            "name": "Example registry",
            "url": "https://example.org/registry",
            "source_type": "public_record",
            "reliability": "reliable",
            "metadata": {"jurisdiction": "example"},
        },
    )
    assert source_response.status_code == 201
    source = source_response.json()
    assert source["metadata"] == {"jurisdiction": "example"}

    evidence_response = await client.post(
        "/api/v1/evidence",
        json={
            "investigation_id": investigation_id,
            "source_id": source["id"],
            "title": "Registry record for example.org",
            "evidence_type": "domain",
            "status": "ready",
            "source_url": "https://example.org/registry",
            "collection_method": "manual web capture",
            "original_data": {"domain": "Example.ORG", "registrant": "Example Organization"},
            "parsed_data": {"domain": "example.org"},
            "tags": ["Domain", " domain "],
        },
    )
    assert evidence_response.status_code == 201
    evidence = evidence_response.json()
    assert evidence["tags"] == ["domain"]
    assert evidence["original_data"]["domain"] == "Example.ORG"

    domain_response = await client.post(
        "/api/v1/entities",
        json={
            "investigation_id": investigation_id,
            "entity_type": "domain",
            "display_name": "example.org",
            "normalized_value": "Example.ORG",
            "verification_state": "supported",
        },
    )
    organization_response = await client.post(
        "/api/v1/entities",
        json={
            "investigation_id": investigation_id,
            "entity_type": "organization",
            "display_name": "Example Organization",
            "normalized_value": "example organization",
        },
    )
    assert domain_response.status_code == 201
    assert organization_response.status_code == 201
    domain = domain_response.json()
    organization = organization_response.json()
    assert domain["normalized_value"] == "example.org"

    relationship_response = await client.post(
        "/api/v1/relationships",
        json={
            "investigation_id": investigation_id,
            "subject_entity_id": organization["id"],
            "object_entity_id": domain["id"],
            "relationship_type": "Registered By",
            "origin": "ai_suggested",
            "verification_state": "unreviewed",
            "confidence": 68,
            "rationale": "Candidate relationship extracted from the registry record.",
            "source_evidence_id": evidence["id"],
        },
    )
    assert relationship_response.status_code == 201
    relationship = relationship_response.json()
    assert relationship["relationship_type"] == "registered_by"
    assert relationship["origin"] == "ai_suggested"
    assert relationship["verification_state"] == "unreviewed"

    evidence_list = await client.get(
        "/api/v1/evidence", params={"investigation_id": investigation_id}
    )
    entity_list = await client.get(
        "/api/v1/entities", params={"investigation_id": investigation_id}
    )
    relationship_list = await client.get(
        "/api/v1/relationships", params={"investigation_id": investigation_id}
    )
    assert evidence_list.json()["total"] == 1
    assert entity_list.json()["total"] == 2
    assert relationship_list.json()["total"] == 1


async def test_rejects_cross_investigation_relationship(client: AsyncClient) -> None:
    first_id = await create_investigation(client, "First investigation")
    second_id = await create_investigation(client, "Second investigation")
    first_entity = (
        await client.post(
            "/api/v1/entities",
            json={
                "investigation_id": first_id,
                "entity_type": "domain",
                "display_name": "first.example",
                "normalized_value": "first.example",
            },
        )
    ).json()
    second_entity = (
        await client.post(
            "/api/v1/entities",
            json={
                "investigation_id": second_id,
                "entity_type": "domain",
                "display_name": "second.example",
                "normalized_value": "second.example",
            },
        )
    ).json()

    response = await client.post(
        "/api/v1/relationships",
        json={
            "investigation_id": first_id,
            "subject_entity_id": first_entity["id"],
            "object_entity_id": second_entity["id"],
            "relationship_type": "associated_with",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Both entities must belong to this investigation"
