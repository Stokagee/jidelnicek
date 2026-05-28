"""EP-3 · Account & login (FR-A) — AC skeletons.

These are pending placeholders (T-2.3). The real bodies land in T-3.1
(tests-first), and the endpoints they exercise land in T-3.2.
"""

from __future__ import annotations

import pytest

PENDING = "skeleton — body lands in T-3.1, implementation in T-3.2"


@pytest.mark.skip(reason=PENDING)
def test_claim_sets_name_password_then_token_reuse_fails_AC11() -> None:
    """AC-11 (FR-A3): a valid claim token sets name+password and activates the
    account; using the same token a second time is rejected."""
    ...
