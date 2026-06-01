"""Week rollover (FR-W1, BR-9, BR-1) — issue #78.

V1 has no week-creation endpoint and the seed (`shared/scripts/seed.py`) is
one-shot, so once the ISO week rolls over the `weeks` row for the new week never
appears and `GET /weeks/current` 404s on every page that calls it. This task
closes that gap: it idempotently inserts the current week's row.

It is pure mechanism — `chooser_id` is left NULL. Who chooses this week is policy,
applied separately via `PUT /weeks/{id}/chooser` (BR-1). All date math is
Europe/Prague (BR-9), matching `api.routers.weeks.current_monday`.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from shared.models import Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")


def current_monday() -> date:
    """BR-9: the current ISO week's Monday, computed in Europe/Prague."""
    today = datetime.now(PRAGUE_TZ).date()
    return today - timedelta(days=today.weekday())


def ensure_current_week(session: Session) -> bool:
    """Ensure a `weeks` row exists for the current week; return whether it created one.

    Idempotent (FR-W1): a no-op returning False when the row already exists. The
    new row carries no chooser (BR-1). `weeks.start_date` is unique, so a lost
    race against a concurrent insert surfaces as an IntegrityError and is treated
    as "already exists" rather than an error.
    """
    monday = current_monday()
    if session.scalar(select(Week).where(Week.start_date == monday)) is not None:
        return False

    session.add(Week(start_date=monday, chooser_id=None))
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        return False
    return True
