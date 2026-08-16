from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Literal


class ProviderCapability(StrEnum):
    CHAT = "chat"
    STREAMING = "streaming"
    REASONING = "reasoning"
    VISION = "vision"
    IMAGE_GENERATION = "image_generation"
    IMAGE_EDITING = "image_editing"
    EMBEDDINGS = "embeddings"
    RERANKING = "reranking"
    SPEECH_TO_TEXT = "speech_to_text"
    TEXT_TO_SPEECH = "text_to_speech"
    CODE = "code"
    STRUCTURED_OUTPUT = "structured_output"
    TOOL_CALLING = "tool_calling"


@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    name: str | None = None


@dataclass(frozen=True, slots=True)
class ChatRequest:
    messages: Sequence[ChatMessage]
    mode: Literal["auto", "fast", "reasoning", "coding", "creative", "vision"] = "auto"
    max_output_tokens: int = 4096
    temperature: float | None = None
    response_schema: dict[str, Any] | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class StreamEvent:
    type: Literal[
        "response.started",
        "message.delta",
        "response.completed",
        "response.failed",
    ]
    delta: str | None = None
    error_code: str | None = None


@dataclass(frozen=True, slots=True)
class EmbeddingRequest:
    texts: Sequence[str]
    model: str | None = None


@dataclass(frozen=True, slots=True)
class EmbeddingResult:
    vectors: Sequence[Sequence[float]]
    provider: str
    model: str
    dimension: int


class AIProvider(ABC):
    """Capability contract for Atlas-owned model services and future modalities."""

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def capabilities(self) -> frozenset[ProviderCapability]:
        raise NotImplementedError

    def supports(self, capability: ProviderCapability) -> bool:
        return capability in self.capabilities

    async def chat(self, request: ChatRequest) -> str:
        del request
        raise ProviderCapabilityError(self.name, ProviderCapability.CHAT)

    def stream_chat(self, request: ChatRequest) -> AsyncIterator[StreamEvent]:
        del request
        raise ProviderCapabilityError(self.name, ProviderCapability.STREAMING)

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResult:
        del request
        raise ProviderCapabilityError(self.name, ProviderCapability.EMBEDDINGS)


class ProviderCapabilityError(RuntimeError):
    def __init__(self, provider: str, capability: ProviderCapability) -> None:
        super().__init__(f"Provider '{provider}' does not support '{capability.value}'.")
        self.provider = provider
        self.capability = capability
