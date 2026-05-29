"""Redis fast-path enqueue (FR-N2 producer side).

After `api` commits a domain change + outbox row, it may best-effort enqueue the
notification id so the worker delivers it promptly. This is only an accelerator:
if Redis is down the periodic sweep (`worker.delivery.deliver_pending`) still
picks the row up, so enqueue failures are swallowed.
"""

from __future__ import annotations

import logging

log = logging.getLogger("worker.queue")

DELIVER_ONE = "deliver_one"


async def enqueue_notification(redis, notification_id: int) -> None:
    """Best-effort: enqueue a single notification id for prompt delivery."""
    try:
        await redis.enqueue_job(DELIVER_ONE, notification_id)
    except Exception as exc:  # sweep is the durability fallback
        log.warning("enqueue failed for notification %s: %s", notification_id, exc)
