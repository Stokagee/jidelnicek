"""arq worker runtime: settings, startup, and the delivery/sweep jobs.

The worker holds a DB sessionmaker and a `NotificationChannel`. Two ingestion
paths, one outcome (FR-N2):
- `deliver_one(notification_id)` — enqueued by api after commit (fast path).
- `sweep_pending()` — cron every `sweep_interval_seconds`, the durable fallback
  that also catches enqueue failures and backend restarts.

The channel is resolved lazily: `shared.channels.build_default_channel()` when
available (Discord in V1, T-8.5), otherwise a stdout logging channel so the
worker is runnable end-to-end before the Discord channel lands.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import ClassVar

from arq import cron
from arq.connections import RedisSettings

from shared.db import get_sessionmaker
from worker.config import get_worker_config
from worker.delivery import deliver_pending

log = logging.getLogger("worker.runtime")


class _LoggingChannel:
    """Fallback channel: logs instead of posting. Replaced by DiscordChannel (T-8.5)."""

    name = "logging"

    def send(self, notification) -> None:
        log.info(
            "notification %s (%s): %s", notification.id, notification.type, notification.payload
        )


def _resolve_channel():
    try:
        from shared.channels import build_default_channel
    except ImportError:
        return _LoggingChannel()
    return build_default_channel()


async def startup(ctx: dict) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    ctx["sessionmaker"] = get_sessionmaker()
    ctx["channel"] = _resolve_channel()
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


def _sweep_seconds() -> set[int]:
    step = max(1, min(60, get_worker_config().sweep_interval_seconds))
    return set(range(0, 60, step))


class WorkerSettings:
    """arq entry point: `arq worker.runtime.WorkerSettings`."""

    functions: ClassVar[list] = [deliver_one]
    cron_jobs: ClassVar[list] = [cron(sweep_pending, second=_sweep_seconds(), run_at_startup=True)]
    on_startup: ClassVar[Callable] = startup
    on_shutdown: ClassVar[Callable] = shutdown
    redis_settings = RedisSettings.from_dsn(get_worker_config().redis_url)
