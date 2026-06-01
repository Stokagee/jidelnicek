"""Week rollover — tests-first (issue #78, FR-W1 / BR-9 / BR-1).

V1 has no week-creation endpoint and the seed is one-shot, so once the ISO week
rolls over the `weeks` row for the new week never appears and `GET /weeks/current`
404s on every page that calls it. The fix is a worker task,
`worker.weeks.ensure_current_week`, run on a cron (and at startup, for catch-up
after the PC has been asleep) that idempotently inserts the current week's row.

Contract under test:
- `worker.weeks.ensure_current_week(session) -> bool` — inserts the current
  week's row (Monday, Europe/Prague — BR-9) when missing and returns True; a
  no-op returning False when it already exists (FR-W1, idempotent).
- The inserted row carries **no chooser** (`chooser_id` NULL): creating the week
  is mechanism, assigning who chooses is policy applied separately (BR-1).
- The job is wired into the worker so it actually runs (run_at_startup catch-up).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from freezegun import freeze_time
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from shared.models import User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD

PRAGUE_TZ = ZoneInfo("Europe/Prague")


def _week_count(session: Session, start_date: date) -> int:
    return session.scalar(
        select(func.count()).select_from(Week).where(Week.start_date == start_date)
    )


def test_ensure_current_week_creates_missing_week_FRW1(
    db_session: Session,
    frozen_clock,
) -> None:
    """FR-W1: with no row for the current week, the task creates one keyed on the
    current Monday and reports that it did."""
    from worker.weeks import current_monday, ensure_current_week

    monday = current_monday()
    assert _week_count(db_session, monday) == 0

    created = ensure_current_week(db_session)

    assert created is True
    week = db_session.scalar(select(Week).where(Week.start_date == monday))
    assert week is not None
    assert week.start_date == monday


def test_ensure_current_week_leaves_chooser_unset_BR1(
    db_session: Session,
    frozen_clock,
) -> None:
    """BR-1: creating the week is pure mechanism — the new row has no chooser; who
    chooses is policy set later via PUT /weeks/{id}/chooser."""
    from worker.weeks import current_monday, ensure_current_week

    ensure_current_week(db_session)

    week = db_session.scalar(select(Week).where(Week.start_date == current_monday()))
    assert week is not None
    assert week.chooser_id is None
    assert week.chooser_start_date is None
    assert week.chooser_end_date is None


def test_ensure_current_week_is_idempotent_FRW1(
    db_session: Session,
    frozen_clock,
) -> None:
    """FR-W1: a second run is a no-op — it returns False and does not duplicate the
    row (start_date is unique)."""
    from worker.weeks import current_monday, ensure_current_week

    assert ensure_current_week(db_session) is True
    assert ensure_current_week(db_session) is False

    assert _week_count(db_session, current_monday()) == 1


def test_ensure_current_week_no_op_when_seeded_week_exists_FRW1(
    db_session: Session,
    make_week: Callable[..., Week],
    frozen_clock,
) -> None:
    """FR-W1: when the current week already exists (e.g. just seeded), the task does
    nothing and keeps the existing row."""
    from worker.weeks import current_monday, ensure_current_week

    existing = make_week(start_date=current_monday())

    assert ensure_current_week(db_session) is False
    assert _week_count(db_session, current_monday()) == 1
    assert db_session.scalar(select(Week).where(Week.start_date == current_monday())).id == (
        existing.id
    )


def test_ensure_current_week_uses_prague_monday_BR9(
    db_session: Session,
) -> None:
    """BR-9: the week is keyed on the Monday of the current ISO week computed in
    Europe/Prague, even when invoked midweek."""
    from worker.weeks import ensure_current_week

    # Wednesday 2026-01-07, 12:00 Prague -> the week's Monday is 2026-01-05.
    with freeze_time(datetime(2026, 1, 7, 12, 0, tzinfo=PRAGUE_TZ)):
        assert ensure_current_week(db_session) is True

    week = db_session.scalar(select(Week).order_by(Week.id.desc()))
    assert week is not None
    assert week.start_date == date(2026, 1, 5)


def test_weeks_current_recovers_after_rollover_issue78(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """issue #78 (FR-W1): only last week's row exists, so /weeks/current 404s. After
    the rollover task runs, the same request succeeds for the current week."""
    from worker.weeks import current_monday, ensure_current_week

    member = make_user(name="member")
    monday = current_monday()
    make_week(start_date=monday - timedelta(days=7))  # last week only — the bug state

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    assert client.get("/weeks/current").status_code == 404

    assert ensure_current_week(db_session) is True

    response = client.get("/weeks/current")
    assert response.status_code == 200
    assert response.json()["start_date"] == monday.isoformat()


def test_ensure_week_is_wired_into_worker_cron() -> None:
    """The task is scheduled and runs at startup, so a week that rolled over while
    the worker was down is created as soon as it comes back up (catch-up)."""
    from worker.runtime import WorkerSettings, ensure_week

    jobs = [job for job in WorkerSettings.cron_jobs if job.coroutine is ensure_week]
    assert jobs, "ensure_week is not registered as a cron job"
    assert any(job.run_at_startup for job in jobs)
