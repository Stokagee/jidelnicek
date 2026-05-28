"""EP-3 · Account & login (FR-A) — tests-first (T-3.1).

Written before the endpoints (T-3.2). Behaviour is exercised through HTTP so no
not-yet-written application module is imported. The whole module is marked
`xfail(strict=True)`: until the endpoints exist these fail (the not-implemented
signal); once T-3.2 lands they xpass, which strict-xfail turns red so the
implementer knows to remove this marker.

Assumed endpoint contract for T-3.2 (consistent with spec §9 / glossary):
- POST /auth/claim   {token, name, password} -> 200; reused/invalid token -> 400/401/409
- POST /auth/login   {name, password}        -> 200 + session cookie; bad creds -> 401
- POST /auth/logout                          -> 200, clears the session
- GET  /me                                   -> 200 {id, name, is_admin}; unauth -> 401
- POST /admin/users/{id}/claim-token         -> 200 {token} (admin only); else 403
- DB session dependency exposed at api.deps.get_session
"""

from __future__ import annotations

from collections.abc import Callable

import pytest
from argon2 import PasswordHasher
from sqlalchemy.orm import Session

from shared.models import User
from tests.fixtures.factories import DEFAULT_PASSWORD

pytestmark = pytest.mark.xfail(
    reason="EP-3 auth endpoints not implemented yet (T-3.2)",
    strict=True,
)


def test_claim_sets_name_password_then_token_reuse_fails_AC11(
    db_session: Session,
    make_user: Callable[..., User],
    claim: Callable[[str, str, str], object],
    login: Callable[[str, str], object],
) -> None:
    """AC-11 (FR-A3): a valid claim token sets name+password and activates the
    account; the token cannot be used a second time."""
    token = "claim-token-AC11"
    make_user(claimed=False, claim_token=token)

    first = claim(token, "Alice", "alice-password")
    assert first.status_code == 200

    # Token consumed -> a second claim with it is rejected (not 404).
    second = claim(token, "Mallory", "mallory-password")
    assert second.status_code in (400, 401, 409)

    # Account is active -> the chosen credentials log in.
    assert login("Alice", "alice-password").status_code == 200


def test_claim_consumes_token_and_stores_password_hash_FRA3_FRA7(
    db_session: Session,
    make_user: Callable[..., User],
    claim: Callable[[str, str, str], object],
) -> None:
    """FR-A3 + FR-A7 + NFR-8: after claim the token hash is cleared, the password
    is stored only as a (verifiable) hash, never as plaintext."""
    token = "claim-token-hashcheck"
    user = make_user(claimed=False, claim_token=token)

    assert claim(token, "Bob", "bob-password").status_code == 200

    db_session.refresh(user)
    assert user.claim_token_hash is None
    assert user.claimed_at is not None
    assert user.password_hash is not None
    assert user.password_hash != "bob-password"
    # The stored hash actually verifies against the chosen password.
    PasswordHasher().verify(user.password_hash, "bob-password")


def test_admin_generates_claim_token_member_cannot_FRA2(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-A2: the admin generates a one-time claim token for an unset account;
    a non-admin member may not."""
    target = make_user(claimed=False)

    # Non-admin member is forbidden.
    member = make_user(name="member")
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    assert client.post(f"/admin/users/{target.id}/claim-token").status_code == 403
    client.post("/auth/logout")

    # Admin succeeds and gets a token back.
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.post(f"/admin/users/{target.id}/claim-token")
    assert response.status_code == 200
    assert response.json().get("token")


def test_login_rejects_wrong_password_and_unknown_user_FRA4(
    db_session: Session,
    admin_user: User,
    login: Callable[[str, str], object],
) -> None:
    """FR-A4: wrong password and unknown user both fail with 401."""
    assert login(admin_user.name, "not-the-password").status_code == 401
    assert login("ghost", "whatever-password").status_code == 401


def test_me_returns_identity_and_admin_flag_FRA6(
    db_session: Session,
    admin_user: User,
    test_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-A6: after login /me reports who the user is and whether they are admin."""
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    admin_me = client.get("/me")
    assert admin_me.status_code == 200
    assert admin_me.json()["id"] == admin_user.id
    assert admin_me.json()["is_admin"] is True
    client.post("/auth/logout")

    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    member_me = client.get("/me")
    assert member_me.status_code == 200
    assert member_me.json()["is_admin"] is False


def test_unauthenticated_request_is_rejected_FRA5(client) -> None:
    """FR-A5: an unauthenticated user sees no data (401), not a 200 payload."""
    assert client.get("/me").status_code == 401


def test_logout_ends_session_FRA4(
    db_session: Session,
    admin_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-A4: after logout the session no longer authenticates."""
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    assert client.get("/me").status_code == 200
    assert client.post("/auth/logout").status_code == 200
    assert client.get("/me").status_code == 401
