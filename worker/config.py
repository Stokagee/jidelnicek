"""Worker configuration (env-driven)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerConfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    redis_url: str = "redis://redis:6379/0"
    # How often the durable sweep runs over pending/failed outbox rows.
    sweep_interval_seconds: int = 30
    # FR-N3: digest cadence (hours).
    digest_interval_hours: int = 6
    # FR-N5: single Discord webhook for the cook's alerts + digest.
    discord_webhook_url: str = ""


@lru_cache
def get_worker_config() -> WorkerConfig:
    return WorkerConfig()
