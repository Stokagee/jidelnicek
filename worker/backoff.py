"""Retry/backoff policy (FR-N6).

Exponential backoff with a cap, and a hard attempt ceiling after which a row is
considered dead-lettered and a critical line is logged. The delivery sweep uses
`should_retry` to stop hammering a permanently broken row.
"""

from __future__ import annotations

from datetime import timedelta

#: Stop retrying after this many failed attempts (FR-N6).
MAX_ATTEMPTS = 8
#: Backoff cap in minutes.
_CAP_MINUTES = 60


def next_retry_delay(attempts: int) -> timedelta:
    """Exponential backoff: min(2**attempts, 60) minutes."""
    minutes = min(2 ** max(attempts, 1), _CAP_MINUTES)
    return timedelta(minutes=minutes)


def should_retry(attempts: int) -> bool:
    """Whether a row with this many attempts is still worth retrying."""
    return attempts < MAX_ATTEMPTS
