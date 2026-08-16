from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_prefix="ATLAS_",
        extra="ignore",
    )

    app_name: str = "Atlas API"
    app_version: str = "0.1.0"
    environment: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False
    secret_key: str = "local-development-secret-change-before-production"
    database_url: str = "postgresql+asyncpg://atlas:atlas@localhost:5432/atlas"
    redis_url: str = "redis://localhost:6379/0"
    embedding_dimension: Literal[1536] = 1536
    access_token_ttl_seconds: int = Field(default=3600, ge=300, le=86400)
    enable_legacy_api: bool = True
    trusted_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1", "test"])
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "atlas://app"]
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("ATLAS_SECRET_KEY must contain at least 32 characters")
        return value

    @model_validator(mode="after")
    def reject_development_secret_in_production(self) -> Self:
        if (
            self.environment == "production"
            and self.secret_key == "local-development-secret-change-before-production"
        ):
            raise ValueError("ATLAS_SECRET_KEY must be replaced in production")
        if self.environment == "production" and self.enable_legacy_api:
            raise ValueError("ATLAS_ENABLE_LEGACY_API must be false in production")
        if self.environment == "production" and "atlas:atlas" in self.database_url:
            raise ValueError("Default database credentials are forbidden in production")
        if self.environment == "production" and "*" in self.cors_origins:
            raise ValueError("Wildcard CORS is forbidden in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
