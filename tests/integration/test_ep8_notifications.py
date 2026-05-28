"""EP-8 · Notifications (FR-N) — AC skeletons.

Pending placeholders (T-2.3). Real bodies in T-8.1; implementation across
T-8.2..T-8.5. Worker-side tests assert on the DB outbox row and a mocked
NotificationChannel (never on Redis state alone).
"""

from __future__ import annotations

import pytest

PENDING = "skeleton — body lands in T-8.1, implementation in T-8.2..T-8.5"


@pytest.mark.skip(reason=PENDING)
def test_cancel_signup_writes_signup_cancelled_outbox_row_AC7() -> None:
    """AC-7 (FR-N1, FR-N2): cancelling a signup writes a `signup_cancelled`
    notification to the outbox in the same DB transaction."""
    ...


@pytest.mark.skip(reason=PENDING)
def test_increase_portions_writes_signup_increased_outbox_row_AC8() -> None:
    """AC-8 (FR-N1, FR-N2): increasing portions writes a `signup_increased`
    notification to the outbox in the same DB transaction."""
    ...


@pytest.mark.skip(reason=PENDING)
def test_worker_catch_up_sends_missed_digest_on_startup_AC9() -> None:
    """AC-9 (FR-N4): after a long sleep (last digest 14h ago) the worker sends
    the missed 6h digest immediately on startup and updates last_run_at."""
    ...


@pytest.mark.skip(reason=PENDING)
def test_failed_discord_delivery_is_retried_AC10() -> None:
    """AC-10 (FR-N6): a failing Discord webhook leaves the notification
    pending/failed, increments attempts, and the worker retries delivery."""
    ...
