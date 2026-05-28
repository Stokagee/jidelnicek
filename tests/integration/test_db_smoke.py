"""Integration smoke tests (T-2.1).

Prove the three pieces of the harness work end to end against the isolated,
migrated test DB: factory writes round-trip through a real Session, per-test
rollback isolation holds, and the FastAPI TestClient can reach the app.
"""

from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import User, Week


def test_factory_round_trips_through_test_db(
    db_session: Session,
    make_user: Callable[..., User],
) -> None:
    user = make_user(name="alice", is_cook=True)
    fetched = db_session.scalar(select(User).where(User.id == user.id))
    assert fetched is not None
    assert fetched.name == "alice"
    assert fetched.is_cook is True


def test_rollback_isolation_between_tests(db_session: Session) -> None:
    """No rows leak in from other tests — each starts on a clean transaction."""
    assert db_session.scalar(select(User)) is None
    assert db_session.scalar(select(Week)) is None


def test_current_week_fixture(current_week: Week, db_session: Session) -> None:
    assert current_week.id is not None
    assert current_week.start_date.weekday() == 0  # Monday (FR-W1)


def test_healthz_via_client(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
