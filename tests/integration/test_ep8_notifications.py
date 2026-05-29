"""EP-8 · Notifications (FR-N) — tests-first (T-8.1).

Two sides:

* Outbox (write side, owned by `code`): a notification row is written in the
  same DB transaction as the signup/dish event (FR-N2). Exercised through HTTP;
  needs the signup/dish endpoints (EP-6/EP-5) + outbox writes (T-8.2).
* Worker (delivery side): the 6h digest catch-up (FR-N4) and retry/backoff
  (FR-N6). The worker modules don't exist yet, so they are imported **lazily
  inside each test** — a missing module surfaces as xfail, not a collection error.

Whole module is `xfail(strict=True)`: fails now, turns red on impl so the marker
is removed. Worker assertions check the DB row **and** the channel mock — never
Redis state alone.

Assumed contracts for EP-8:
- Outbox row: `notifications(type, payload, channel='discord', status='pending',
  attempts=0)` written with the event (FR-N2). Types per DM-notifications.
- `worker.delivery.deliver_pending(session, channel) -> int` — sends pending rows;
  success -> status='sent', sent_at set; failure -> attempts += 1, last_error set,
  status stays pending/failed for a later retry (FR-N6).
- `worker.digest.run_due_digest(session, channel, *, key='digest_6h',
  interval_hours=6) -> bool` — if the slot is overdue per `scheduler_state`, send
  the digest and set last_run_at = now; else no-op (FR-N4).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import (
    Dish,
    Notification,
    NotificationStatus,
    NotificationType,
    SchedulerState,
    Signup,
    User,
    Week,
)
from tests.fixtures.factories import DEFAULT_PASSWORD

PRAGUE_TZ = ZoneInfo("Europe/Prague")
DIGEST_KEY = "digest_6h"

pytestmark = pytest.mark.xfail(
    reason="EP-8 notifications (outbox writes + worker) not implemented yet (T-8.2..T-8.5)",
    strict=True,
)


def _notification_of_type(db_session: Session, ntype: NotificationType) -> Notification | None:
    return db_session.scalars(
        select(Notification).where(Notification.type == ntype).order_by(Notification.id.desc())
    ).first()


# --------------------------------------------------------------------------- #
# Outbox (write side) — FR-N1, FR-N2                                           #
# --------------------------------------------------------------------------- #


def test_new_signup_writes_signup_created_outbox_FRN1(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-N1/FR-N2: a new signup writes a `signup_created` outbox row."""
    member = make_user(name="member")
    week = make_week()
    dish = make_dish(week=week, proposed_by=member)

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    payload = {"dish_id": dish.id, "day": dish.start_date.isoformat(), "portions": 2}
    assert client.post("/signups", json=payload).status_code in (200, 201)

    row = _notification_of_type(db_session, NotificationType.SIGNUP_CREATED)
    assert row is not None
    assert row.status == NotificationStatus.PENDING


def test_increase_portions_writes_signup_increased_outbox_AC8(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., Signup],
    client,
    login: Callable[[str, str], object],
) -> None:
    """AC-8 (FR-N1, FR-N2): increasing portions writes a `signup_increased` row in
    the same transaction as the change."""
    member = make_user(name="member")
    week = make_week()
    dish = make_dish(week=week, proposed_by=member)
    signup = make_signup(dish=dish, user=member, day=dish.start_date, portions=1)

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    assert client.patch(f"/signups/{signup.id}", json={"portions": 3}).status_code == 200

    row = _notification_of_type(db_session, NotificationType.SIGNUP_INCREASED)
    assert row is not None
    assert row.status == NotificationStatus.PENDING


def test_decrease_portions_writes_signup_decreased_outbox_FRN1(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., Signup],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-N1: lowering portions writes a `signup_decreased` row (wasteful-purchase
    alert)."""
    member = make_user(name="member")
    week = make_week()
    dish = make_dish(week=week, proposed_by=member)
    signup = make_signup(dish=dish, user=member, day=dish.start_date, portions=3)

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    assert client.patch(f"/signups/{signup.id}", json={"portions": 1}).status_code == 200

    assert _notification_of_type(db_session, NotificationType.SIGNUP_DECREASED) is not None


def test_cancel_signup_writes_signup_cancelled_outbox_AC7(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., Signup],
    client,
    login: Callable[[str, str], object],
) -> None:
    """AC-7 (FR-N1, FR-N2): cancelling a signup writes a `signup_cancelled` row in
    the same transaction."""
    member = make_user(name="member")
    week = make_week()
    dish = make_dish(week=week, proposed_by=member)
    signup = make_signup(dish=dish, user=member, day=dish.start_date, portions=2)

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    assert client.delete(f"/signups/{signup.id}").status_code == 200

    row = _notification_of_type(db_session, NotificationType.SIGNUP_CANCELLED)
    assert row is not None
    assert row.status == NotificationStatus.PENDING


def test_chooser_proposing_dish_writes_dish_proposed_outbox_FRN1(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-N1: a new dish proposed by the chooser writes a `dish_proposed` row."""
    chooser = make_user(name="chooser")
    week = make_week(chooser=chooser)

    assert login(chooser.name, DEFAULT_PASSWORD).status_code == 200
    payload = {
        "week_id": week.id,
        "name": "Guláš",
        "start_date": week.start_date.isoformat(),
        "end_date": (week.start_date + timedelta(days=2)).isoformat(),
    }
    assert client.post("/dishes", json=payload).status_code in (200, 201)

    assert _notification_of_type(db_session, NotificationType.DISH_PROPOSED) is not None


# --------------------------------------------------------------------------- #
# Worker (delivery side) — FR-N4 catch-up, FR-N6 retry                         #
# --------------------------------------------------------------------------- #


class _RecordingChannel:
    """Test double for the NotificationChannel interface (FR-N5)."""

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.calls = 0

    def send(self, notification: Notification) -> None:
        self.calls += 1
        if self.fail:
            raise RuntimeError("discord webhook down")


def test_worker_catch_up_sends_missed_digest_on_startup_AC9(
    db_session: Session,
    frozen_clock,
) -> None:
    """AC-9 (FR-N4): the last digest was 14h ago (PC asleep). On the next run the
    worker fires the missed digest immediately and advances last_run_at."""
    from worker.digest import run_due_digest  # lazy: exists from T-8.4

    now = datetime.now(PRAGUE_TZ)
    stale = now - timedelta(hours=14)
    db_session.add(SchedulerState(key=DIGEST_KEY, last_run_at=stale))
    db_session.flush()

    sent = run_due_digest(db_session, _RecordingChannel(), key=DIGEST_KEY, interval_hours=6)
    assert sent is True

    assert _notification_of_type(db_session, NotificationType.DIGEST) is not None
    state = db_session.get(SchedulerState, DIGEST_KEY)
    assert state.last_run_at is not None
    assert state.last_run_at > stale


def test_failed_discord_delivery_is_retried_AC10(
    db_session: Session,
) -> None:
    """AC-10 (FR-N6): a failing webhook leaves the notification undelivered with
    attempts incremented; a later sweep retries and succeeds."""
    from worker.delivery import deliver_pending  # lazy: exists from T-8.3/T-8.5

    notification = Notification(
        type=NotificationType.SIGNUP_CREATED,
        payload={"detail": "test"},
        channel="discord",
        status=NotificationStatus.PENDING,
    )
    db_session.add(notification)
    db_session.flush()

    failing = _RecordingChannel(fail=True)
    deliver_pending(db_session, failing)
    db_session.refresh(notification)
    assert failing.calls >= 1
    assert notification.status in (NotificationStatus.PENDING, NotificationStatus.FAILED)
    assert notification.attempts >= 1
    assert notification.last_error is not None

    # A later sweep with a healthy channel delivers it.
    healthy = _RecordingChannel()
    deliver_pending(db_session, healthy)
    db_session.refresh(notification)
    assert healthy.calls >= 1
    assert notification.status == NotificationStatus.SENT
    assert notification.sent_at is not None
