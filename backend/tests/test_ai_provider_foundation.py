from collections.abc import AsyncIterator

import pytest

from app.ai.providers.base import (
    AIProvider,
    ChatRequest,
    ProviderCapability,
    StreamEvent,
)
from app.ai.providers.registry import (
    ProviderNotFoundError,
    ProviderRegistry,
    ProviderUnavailableError,
)


class ChatOnlyProvider(AIProvider):
    @property
    def name(self) -> str:
        return "chat-only"

    @property
    def capabilities(self) -> frozenset[ProviderCapability]:
        return frozenset({ProviderCapability.CHAT})

    async def chat(self, request: ChatRequest) -> str:
        return request.messages[-1].content


class StreamingProvider(ChatOnlyProvider):
    @property
    def name(self) -> str:
        return "streaming"

    @property
    def capabilities(self) -> frozenset[ProviderCapability]:
        return frozenset({ProviderCapability.CHAT, ProviderCapability.STREAMING})

    async def _events(self) -> AsyncIterator[StreamEvent]:
        yield StreamEvent(type="response.started")
        yield StreamEvent(type="response.completed")

    def stream_chat(self, request: ChatRequest) -> AsyncIterator[StreamEvent]:
        del request
        return self._events()


def test_registry_resolves_only_supported_capabilities() -> None:
    registry = ProviderRegistry([ChatOnlyProvider(), StreamingProvider()])

    assert registry.get("CHAT-ONLY", ProviderCapability.CHAT).name == "chat-only"
    assert [provider.name for provider in registry.available(ProviderCapability.STREAMING)] == [
        "streaming"
    ]

    with pytest.raises(ProviderUnavailableError):
        registry.get("chat-only", ProviderCapability.EMBEDDINGS)
    with pytest.raises(ProviderNotFoundError):
        registry.get("missing")


def test_registry_rejects_duplicate_provider_names() -> None:
    registry = ProviderRegistry([ChatOnlyProvider()])

    with pytest.raises(ValueError, match="already registered"):
        registry.register(ChatOnlyProvider())
