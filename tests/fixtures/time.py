"""Deterministic clock fixture.

BR-9: all date math is `Europe/Prague`. Tests that depend on "now" (notably the
AC-9 digest catch-up) freeze time to a known Monday so behaviour is reproducible.
The yielded object is freezegun's frozen-time handle — use `.move_to(...)` to
jump and `.tick(delta)` to advance.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from freezegun import freeze_time
from freezegun.api import FrozenDateTimeFactory

PRAGUE_TZ = ZoneInfo("Europe/Prague")

#: A fixed reference instant: Monday 2026-01-05, 12:00 Europe/Prague.
FROZEN_NOW = datetime(2026, 1, 5, 12, 0, tzinfo=PRAGUE_TZ)


@pytest.fixture
def frozen_clock() -> Iterator[FrozenDateTimeFactory]:
    with freeze_time(FROZEN_NOW) as frozen:
        yield frozen
