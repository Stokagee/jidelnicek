"""EP-7 · Cook summary (FR-K) — AC skeletons.

Pending placeholders (T-2.3). Real bodies in T-7.1; endpoint in T-7.2.
"""

from __future__ import annotations

import pytest

PENDING = "skeleton — body lands in T-7.1, implementation in T-7.2"


@pytest.mark.skip(reason=PENDING)
def test_day_summary_includes_admin_own_portions_AC4() -> None:
    """AC-4 (FR-K1, FR-K2): the per-day summary sums all active signups,
    including the admin's own portions (2 + 1 + 2 = 5)."""
    ...
