"""Unit smoke test — proves the pytest harness collects and runs (T-2.1).

No DB, no app: just confirms the suite is wired up.
"""

from __future__ import annotations


def test_harness_runs() -> None:
    assert True


def test_models_import() -> None:
    """The shared ORM package imports and exposes the six DM-* tables."""
    from shared.models import Base

    expected = {"users", "weeks", "dishes", "signups", "notifications", "scheduler_state"}
    assert expected <= set(Base.metadata.tables)
