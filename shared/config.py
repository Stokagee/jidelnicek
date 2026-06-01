"""Application configuration (shared by api and worker).

Values come from the environment (and a local ``.env`` when present). Defaults
are dev/test-friendly so the test suite — which overrides the DB session and
never opens a real network connection for auth — needs no special setup.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLAlchemy URL. In tests the DB-session dependency is overridden, so this is
    # only used by the running service.
    database_url: str = (
        "postgresql+psycopg://jidelnicek:change-me-strong-password@127.0.0.1:5432/jidelnicek"
    )
    # Session cookie signing key (NFR-8). Overridden in real deployments.
    session_secret: str = "dev-insecure-session-secret-change-me"
    # httpOnly session cookie name.
    session_cookie_name: str = "jidelnicek_session"
    # Cookie lifetime in seconds (default 14 days).
    session_max_age: int = 14 * 24 * 3600
    # FR-N5: single Discord webhook for the cook's alerts + digest. Empty = log only.
    discord_webhook_url: str = ""
    # Issue #69: fail fast at startup if the DB is behind the code's Alembic head.
    # Disabled in the test suite, which manages its own migrated DB per session.
    verify_schema_on_startup: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
