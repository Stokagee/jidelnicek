"""EP-4 · Week & chooser (FR-W) — AC skeletons.

Pending placeholders (T-2.3). Real bodies in T-4.1; endpoints in T-4.2.
"""

from __future__ import annotations

import pytest

PENDING = "skeleton — body lands in T-4.1, implementation in T-4.2"


@pytest.mark.skip(reason=PENDING)
def test_non_chooser_member_cannot_create_dish_AC5() -> None:
    """AC-5 (FR-W4, BR-6): a member who is not the week's chooser is rejected
    when trying to create a dish in that week."""
    ...
