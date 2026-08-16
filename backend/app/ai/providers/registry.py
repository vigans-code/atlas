from collections.abc import Iterable

from app.ai.providers.base import AIProvider, ProviderCapability


class ProviderRegistry:
    """Small explicit registry; routing policy remains outside provider implementations."""

    def __init__(self, providers: Iterable[AIProvider] = ()) -> None:
        self._providers: dict[str, AIProvider] = {}
        for provider in providers:
            self.register(provider)

    def register(self, provider: AIProvider) -> None:
        normalized = provider.name.strip().lower()
        if not normalized:
            raise ValueError("Provider name cannot be empty.")
        if normalized in self._providers:
            raise ValueError(f"Provider '{normalized}' is already registered.")
        self._providers[normalized] = provider

    def get(self, name: str, capability: ProviderCapability | None = None) -> AIProvider:
        normalized = name.strip().lower()
        provider = self._providers.get(normalized)
        if provider is None:
            raise ProviderNotFoundError(normalized)
        if capability is not None and not provider.supports(capability):
            raise ProviderUnavailableError(normalized, capability)
        return provider

    def available(self, capability: ProviderCapability) -> tuple[AIProvider, ...]:
        return tuple(
            provider for provider in self._providers.values() if provider.supports(capability)
        )


class ProviderNotFoundError(LookupError):
    def __init__(self, provider: str) -> None:
        super().__init__(f"Provider '{provider}' is not registered.")
        self.provider = provider


class ProviderUnavailableError(RuntimeError):
    def __init__(self, provider: str, capability: ProviderCapability) -> None:
        super().__init__(f"Provider '{provider}' is unavailable for '{capability.value}'.")
        self.provider = provider
        self.capability = capability
