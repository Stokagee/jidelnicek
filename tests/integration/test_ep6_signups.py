"""EP-6 · Signups (FR-S) — AC skeletons.

Pending placeholders (T-2.3). Real bodies in T-6.1; endpoints in T-6.2.
Note: T-6.1 also adds DB-level invariant tests for BR-3 / BR-4 that pass
immediately (the constraints already shipped in EP-1).
"""

from __future__ import annotations

import pytest

PENDING = "skeleton — body lands in T-6.1, implementation in T-6.2"


@pytest.mark.skip(reason=PENDING)
def test_signup_day_outside_block_is_rejected_AC1() -> None:
    """AC-1 (FR-S1, BR-2): signing up for a day outside the dish's block is
    rejected."""
    ...


@pytest.mark.skip(reason=PENDING)
def test_signup_portions_must_be_at_least_one_AC2() -> None:
    """AC-2 (FR-S1, BR-4): portions of 0 or negative are rejected."""
    ...


@pytest.mark.skip(reason=PENDING)
def test_resignup_same_day_updates_existing_AC3() -> None:
    """AC-3 (BR-3): re-signing up for the same (dish, day) updates the existing
    active signup instead of creating a duplicate."""
    ...


@pytest.mark.skip(reason=PENDING)
def test_member_can_signup_to_chooser_proposed_dish_AC6() -> None:
    """AC-6 (FR-S3): a member can sign up to a dish proposed by the chooser."""
    ...
