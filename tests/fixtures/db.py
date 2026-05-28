"""Test database fixtures.

A dedicated, disposable Postgres database (`jidelnicek_test` by default) that is
fully isolated from the dev DB (testing skill rule 4). The schema is built by
running the real Alembic migrations against it — so the migration chain itself
is exercised on every test session — and each test runs inside a transaction
that is rolled back at teardown for fast, total isolation.

Why a real Postgres and not SQLite: the BR-3 active-signup uniqueness is a
*partial* unique index (`postgresql_where`), and several columns are JSONB /
native enums. Those are Postgres-only, so tests must run against Postgres.

Connection resolution order:
  1. `TEST_DATABASE_URL` (explicit, wins).
  2. Derived from `DATABASE_URL`: host `db` → `localhost` (tests run on the host,
     not inside the compose network) and database name suffixed with `_test`.
  3. A local default matching `.env.example`.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

REPO_ROOT = Path(__file__).resolve().parents[2]
_ALEMBIC_INI = REPO_ROOT / "shared" / "alembic.ini"
# 127.0.0.1, not "localhost": on Windows "localhost" resolves to IPv6 ::1 first
# and adds a multi-second connect penalty per connection before falling back to
# IPv4 — which makes the per-test connects look like a hang.
_DEFAULT_TEST_URL = (
    "postgresql+psycopg://jidelnicek:change-me-strong-password@127.0.0.1:5432/jidelnicek_test"
)


def test_database_url() -> str:
    """Resolve the URL of the isolated test database (see module docstring)."""
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        return explicit

    base = os.environ.get("DATABASE_URL")
    if base:
        url = make_url(base)
        # Tests run on the host, not inside the compose network; force IPv4 to
        # avoid the Windows "localhost"→::1 connect penalty (see _DEFAULT_TEST_URL).
        host = "127.0.0.1" if url.host in (None, "db", "localhost") else url.host
        db_name = f"{url.database or 'jidelnicek'}_test"
        return url.set(host=host, database=db_name).render_as_string(hide_password=False)

    return _DEFAULT_TEST_URL


def _ensure_database(url_str: str) -> None:
    """Create the test database if it does not exist yet (idempotent)."""
    url = make_url(url_str)
    db_name = url.database
    admin_url = url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", future=True)
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": db_name},
            ).scalar()
            if not exists:
                # db_name comes from our own config, not user input.
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    finally:
        admin_engine.dispose()


def _run_migrations(url_str: str) -> None:
    """Upgrade the test database to head using the project's Alembic config.

    `shared/alembic/env.py` reads the URL from `DATABASE_URL`, so we point that
    at the test database for the duration of the upgrade.
    """
    from alembic import command
    from alembic.config import Config

    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = url_str
    try:
        cfg = Config(str(_ALEMBIC_INI))
        command.upgrade(cfg, "head")
    finally:
        if previous is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    """Session-scoped engine bound to a migrated, isolated test database."""
    url = test_database_url()
    _ensure_database(url)
    _run_migrations(url)
    eng = create_engine(url, future=True, poolclass=NullPool)
    try:
        yield eng
    finally:
        eng.dispose()


@pytest.fixture
def db_session(engine: Engine) -> Iterator[Session]:
    """A Session wrapped in an outer transaction that is rolled back per test.

    `join_transaction_mode="create_savepoint"` lets application code (and the
    API dependency override) call `commit()` freely: commits release a SAVEPOINT
    rather than the outer transaction, so the final rollback still wipes
    everything the test wrote.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint", future=True)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
