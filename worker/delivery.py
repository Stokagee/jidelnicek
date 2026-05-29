"""Outbox delivery (FR-N2, FR-N6).

`deliver_pending` is the durable sweep: it queries the outbox for rows that still
need delivery (`pending` + retry-due `failed`) and pushes each through a
`NotificationChannel`. The outbox — not Redis — is the source of truth, so this
function alone guarantees at-least-once delivery even if the Redis fast-path is
unavailable (NFR-6).

On channel failure a row is left for a later sweep with `attempts` incremented and
`last_error` recorded (FR-N6); on success it becomes `sent`.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import Notification, NotificationStatus

PRAGUE_TZ = ZoneInfo("Europe/Prague")

# Rows eligible for a delivery attempt: freshly written (pending) and prior
# failures awaiting retry (failed).
_DELIVERABLE = (NotificationStatus.PENDING, NotificationStatus.FAILED)


def deliver_pending(session: Session, channel, *, limit: int = 100) -> int:
    """Deliver outbox rows that still need sending. Returns the count delivered."""
    rows = session.scalars(
        select(Notification)
        .where(Notification.status.in_(_DELIVERABLE))
        .order_by(Notification.id)
        .limit(limit)
    ).all()

    delivered = 0
    for notification in rows:
        try:
            channel.send(notification)
        except Exception as exc:  # any channel error is retryable (FR-N6)
            notification.attempts += 1
            notification.last_error = str(exc)
            notification.status = NotificationStatus.FAILED
        else:
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now(PRAGUE_TZ)
            delivered += 1

    session.commit()
    return delivered
