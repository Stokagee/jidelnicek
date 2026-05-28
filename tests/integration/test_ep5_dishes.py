"""EP-5 · Dishes (FR-D) — AC skeletons.

Pending placeholders (T-2.3). Real bodies in T-5.1; endpoints in T-5.2.
"""

from __future__ import annotations

import pytest

PENDING = "skeleton — body lands in T-5.1, implementation in T-5.2"


@pytest.mark.skip(reason=PENDING)
def test_non_creator_non_admin_member_cannot_delete_dish_AC12() -> None:
    """AC-12 (FR-D5, BR-5): a chooser-proposed dish cannot be deleted by another
    member who is neither its proposer nor the admin."""
    ...
