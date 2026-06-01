"""Schema-version guard (issue #69).

Compares the live database's applied Alembic revision(s) against the head
revision(s) declared by the migration scripts. The API runs
``verify_schema_up_to_date`` at startup so a database that is behind the code
fails fast with an actionable message, instead of surfacing a cryptic
``UndefinedColumn`` 500 deep inside an unrelated request.

This is mechanism, not policy: it only *detects* drift and tells the operator to
run the migration — it never applies one itself (migrations stay an explicit,
reviewed step; see CLAUDE.md §2).
"""

from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Connection, Engine

_ALEMBIC_INI = Path(__file__).resolve().parent / "alembic.ini"

#: How to bring a lagging database up to date (kept in sync with the README).
UPGRADE_COMMAND = "uv run alembic -c shared/alembic.ini upgrade head"


class SchemaOutOfDateError(RuntimeError):
    """Raised when the database is not migrated to the code's head revision."""


def head_revisions() -> set[str]:
    """Head revision(s) declared by the migration scripts in ``shared/alembic``."""
    script = ScriptDirectory.from_config(Config(str(_ALEMBIC_INI)))
    return set(script.get_heads())


def current_revisions(bind: Engine | Connection) -> set[str]:
    """Revision(s) currently stamped in the database.

    An empty set means the database has never been migrated. Accepts either an
    ``Engine`` (a short-lived connection is opened) or an existing ``Connection``
    (so tests can probe a rolled-back transaction without committing).
    """
    if isinstance(bind, Engine):
        with bind.connect() as connection:
            return _heads_for_connection(connection)
    return _heads_for_connection(bind)


def _heads_for_connection(connection: Connection) -> set[str]:
    context = MigrationContext.configure(connection)
    return set(context.get_current_heads())


def verify_schema_up_to_date(bind: Engine | Connection) -> None:
    """Fail fast unless the database is on the code's head revision (issue #69)."""
    head = head_revisions()
    current = current_revisions(bind)
    if current != head:
        where = sorted(current) if current else "an empty / unmigrated state"
        raise SchemaOutOfDateError(
            f"Database schema is out of date: DB is at {where}, code expects "
            f"{sorted(head)}. Run: {UPGRADE_COMMAND}"
        )
