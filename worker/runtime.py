"""arq worker runtime: settings, startup, and the delivery/sweep jobs.

The worker holds a DB sessionmaker and a `NotificationChannel`. Two ingestion
paths, one outcome (FR-N2):
- `deliver_one(notification_id)` — enqueued by api after commit (fast path).
- `sweep_pending()` — cron every `sweep_interval_seconds`, the durable fallback
  that also catches enqueue failures and backend restarts.

The channel comes from `shared.channels.build_default_channel()` — Discord when a
webhook is configured, otherwise a stdout logging channel (FR-N5).
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import ClassVar

from arq import cron
from arq.connections import RedisSettings

from shared.channels import build_default_channel
from shared.db import get_sessionmaker
from worker.config import get_worker_config
from worker.delivery import deliver_pending
from worker.digest import run_due_digest
from worker.weeks import ensure_current_week

log = logging.getLogger("worker.runtime")


async def startup(ctx: dict) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    ctx["sessionmaker"] = get_sessionmaker()
    ctx["channel"] = build_default_channel()
    log.info("worker started (channel=%s)", getattr(ctx["channel"], "name", "?"))


async def shutdown(ctx: dict) -> None:
    log.info("worker stopping")


async def deliver_one(ctx: dict, notification_id: int) -> int:
    """Fast-path delivery. Delegates to the sweep, which is idempotent and also
    clears any other rows that happen to be pending."""
    with ctx["sessionmaker"]() as session:
        return deliver_pending(session, ctx["channel"])


async def sweep_pending(ctx: dict) -> int:
    """Durable sweep over pending/failed outbox rows (FR-N2)."""
    with ctx["sessionmaker"]() as session:
        return deliver_pending(session, ctx["channel"])


async def send_digest_if_due(ctx: dict) -> bool:
    """Fire the 6h digest if its slot is overdue (FR-N4 catch-up)."""
    with ctx["sessionmaker"]() as session:
        return run_due_digest(
            session,
            ctx["channel"],
            interval_hours=get_worker_config().digest_interval_hours,
        )


async def ensure_week(ctx: dict) -> bool:
    """FR-W1: make sure the current week's row exists (issue #78).

    V1 has no week-creation endpoint, so without this every new ISO week makes
    `GET /weeks/current` 404 until someone inserts a row. Idempotent (BR-1: no
    chooser is assigned here)."""
    with ctx["sessionmaker"]() as session:
        return ensure_current_week(session)


def _sweep_seconds() -> set[int]:
    step = max(1, min(60, get_worker_config().sweep_interval_seconds))
    return set(range(0, 60, step))


class WorkerSettings:
    """arq entry point: `arq worker.runtime.WorkerSettings`."""

    functions: ClassVar[list] = [deliver_one]
    cron_jobs: ClassVar[list] = [
        cron(sweep_pending, second=_sweep_seconds(), run_at_startup=True),
        # Check the digest slot every 5 min and on startup (catch-up, FR-N4).
        cron(send_digest_if_due, minute=set(range(0, 60, 5)), run_at_startup=True),
        # Ensure the current week's row exists (FR-W1, issue #78): hourly + on
        # startup so a week that rolled over while the worker was down (PC asleep)
        # is created as soon as it comes back up. Idempotent, so cheap to repeat.
        cron(ensure_week, minute={0}, run_at_startup=True),
    ]
    on_startup: ClassVar[Callable] = startup
    on_shutdown: ClassVar[Callable] = shutdown
    redis_settings = RedisSettings.from_dsn(get_worker_config().redis_url)
