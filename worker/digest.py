"""6h digest with catch-up (FR-N3, FR-N4, AC-9).

`run_due_digest` is idempotent per slot: it reads `scheduler_state[key]`, and if
the slot is overdue (last run NULL or older than `now - interval_hours`) it
composes the digest, writes a `digest` notification row, advances `last_run_at`,
and delivers — **all in one transaction**. This is what gives catch-up: after the
PC sleeps through one or more slots, the next run fires the missed digest
immediately (AC-9). Scheduling math is anchored on Europe/Prague (BR-9).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from shared.models import (
    Dish,
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
    SchedulerState,
    Signup,
    Week,
)

PRAGUE_TZ = ZoneInfo("Europe/Prague")
DEFAULT_DIGEST_KEY = "digest_6h"


def _compose_digest_payload(session: Session, now: datetime) -> dict:
    """Read-only summary: per (day, dish) active-portion totals for the current and
    upcoming weeks. No business rules here (they were enforced on write)."""
    monday = now.date() - timedelta(days=now.date().weekday())
    rows = session.execute(
        select(Dish.id, Dish.name, Signup.day, func.sum(Signup.portions))
        .join(Signup, Signup.dish_id == Dish.id)
        .join(Week, Week.id == Dish.week_id)
        .where(
            Week.start_date >= monday,
            Signup.deleted_at.is_(None),
            Dish.deleted_at.is_(None),
        )
        .group_by(Dish.id, Dish.name, Signup.day)
        .order_by(Signup.day, Dish.id)
    ).all()
    items = [
        {"dish_id": dish_id, "name": name, "day": day.isoformat(), "portions": int(total)}
        for dish_id, name, day, total in rows
    ]
    return {"generated_at": now.isoformat(), "items": items}


def run_due_digest(
    session: Session,
    channel,
    *,
    key: str = DEFAULT_DIGEST_KEY,
    interval_hours: int = 6,
) -> bool:
    """Send the digest if the slot is overdue; return whether it fired (FR-N4)."""
    now = datetime.now(PRAGUE_TZ)

    state = session.get(SchedulerState, key)
    if state is None:
        state = SchedulerState(key=key, last_run_at=None)
        session.add(state)

    due = state.last_run_at is None or state.last_run_at <= now - timedelta(hours=interval_hours)
    if not due:
        return False

    notification = Notification(
        type=NotificationType.DIGEST,
        payload=_compose_digest_payload(session, now),
        channel=NotificationChannel.DISCORD,
        status=NotificationStatus.PENDING,
        attempts=0,
    )
    session.add(notification)
    state.last_run_at = now  # advance the slot in the same tx (catch-up complete).
    session.flush()

    # Deliver immediately; on failure leave it for the sweep to retry (FR-N6).
    try:
        channel.send(notification)
    except Exception as exc:  # any channel error is retryable
        notification.attempts += 1
        notification.last_error = str(exc)
        notification.status = NotificationStatus.FAILED
    else:
        notification.status = NotificationStatus.SENT
        notification.sent_at = now

    session.commit()
    return True
