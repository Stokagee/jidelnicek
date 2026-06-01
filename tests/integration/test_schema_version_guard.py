"""Schema-version startup guard (issue #69).

The guard compares the database's stamped Alembic revision against the head
declared by the migration scripts and fails fast on drift. These tests run
against the session-scoped, migrated test DB.
"""

from __future__ import annotations

import pytest
from sqlalchemy import Engine, text

from shared.schema_version import (
    UPGRADE_COMMAND,
    SchemaOutOfDateError,
    current_revisions,
    head_revisions,
    verify_schema_up_to_date,
)


def test_head_revisions_are_defined() -> None:
    assert head_revisions(), "migration scripts must declare at least one head"


def test_migrated_db_is_on_head(engine: Engine) -> None:
    assert current_revisions(engine) == head_revisions()


def test_verify_passes_on_migrated_db(engine: Engine) -> None:
    verify_schema_up_to_date(engine)  # must not raise


def test_verify_fails_when_db_behind(engine: Engine) -> None:
    """A DB that is not on head raises with an actionable message.

    The fake "behind" state is written inside a transaction that is rolled back,
    so the shared migrated DB stays on head for every other test.
    """
    connection = engine.connect()
    transaction = connection.begin()
    try:
        connection.execute(text("DELETE FROM alembic_version"))
        with pytest.raises(SchemaOutOfDateError) as excinfo:
            verify_schema_up_to_date(connection)
        assert UPGRADE_COMMAND in str(excinfo.value)
    finally:
        transaction.rollback()
        connection.close()
