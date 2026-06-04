"""6h digest with catch-up (FR-N3, FR-N4, AC-9).

`run_due_digest` is idempotent per slot: it reads `scheduler_state[key]`, and if
the slot is overdue (last run NULL or older than `now - interval_hours`) it
composes the digest, writes a `digest` notification row, advances `last_run_at`,
and delivers — **all in one transaction**. This is what gives catch-up: after the
PC sleeps through one or more slots, the next run fires the missed digest
immediately (AC-9). Scheduling math is anchored on Europe/Prague (BR-9).

Issue #73: an overdue slot with nothing new since the last digest (no non-digest
outbox rows — FR-N7's "changes since the last digest") sends nothing. The slot is
still consumed (`last_run_at` advances) so the cadence stays anchored, but no
empty digest is posted to the channel.
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


def _has_changes_since(session: Session, watermark: datetime | None) -> bool:
    """Issue #73 / FR-N7: was there any reportable change since the last digest?

    Every demand change (FR-N1: signup created/increased/decreased/cancelled, a
    new dish proposed) writes a non-digest notification row transactionally
    (FR-N2), so the outbox itself is the log of "what happened". No such rows
    since the last digest ⇒ nothing new to summarise ⇒ skip the send."""
    query = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.type != NotificationType.DIGEST)
    )
    if watermark is not None:
        query = query.where(Notification.created_at > watermark)
    return session.execute(query).scalar_one() > 0


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

    # Issue #73: only send the 6h digest when something changed since the last one
    # (FR-N7: the digest reports "changes since the last digest"). When nothing
    # happened we still consume the slot — advance last_run_at so the cadence stays
    # anchored and the next check is a fresh 6h window — but write and send nothing.
    if not _has_changes_since(session, state.last_run_at):
        state.last_run_at = now
        session.commit()
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
