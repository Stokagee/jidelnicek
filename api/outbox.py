"""Transactional outbox writes (FR-N1 / FR-N2).

Every state change that affects demand writes a `notifications` row **in the same
SQLAlchemy session/transaction** as the domain change, so nothing is lost on a
backend crash (NFR-6). This module only writes the row (no commit) — the caller's
transaction wraps both the domain write and the outbox row. Delivery (Redis
enqueue + worker sweep) lives in the worker (T-8.3+).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from shared.models import Notification, NotificationChannel, NotificationStatus, NotificationType


def write_notification(
    session: Session,
    *,
    type: NotificationType,
    payload: dict,
    channel: NotificationChannel = NotificationChannel.DISCORD,
) -> Notification:
    """Add a pending outbox row to the current transaction (does not commit)."""
    notification = Notification(
        type=type,
        payload=payload,
        channel=channel,
        status=NotificationStatus.PENDING,
        attempts=0,
    )
    session.add(notification)
    return notification
