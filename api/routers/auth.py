"""Account & login endpoints (EP-3 / FR-A).

Session is an httpOnly signed cookie carrying the user id (api/security.py).
Passwords and claim tokens are argon2-hashed (shared/security.py, NFR-8).
"""

from __future__ import annotations

import secrets
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from api.deps import AdminUser, CurrentUser, SessionDep
from api.schemas.auth import (
    ClaimRequest,
    ClaimTokenResponse,
    LoginRequest,
    MeResponse,
    UserResponse,
)
from api.security import make_session
from shared.config import get_settings
from shared.models import User
from shared.security import hash_password, hash_token, verify_password, verify_token

PRAGUE_TZ = ZoneInfo("Europe/Prague")

router = APIRouter(tags=["auth"])


def _set_session_cookie(response: Response, user_id: int) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=make_session(user_id),
        httponly=True,
        samesite="lax",
        max_age=settings.session_max_age,
        path="/",
    )


@router.post("/auth/claim", response_model=MeResponse)
def claim(body: ClaimRequest, session: SessionDep, response: Response) -> MeResponse:
    """FR-A3/FR-A7: set name+password from a single-use claim token.

    The token is opaque, so we find the unclaimed user whose stored hash verifies
    (n <= 4 members). On success the token is consumed (hash cleared) so a second
    claim with it fails (AC-11).
    """
    candidates = session.scalars(
        select(User).where(User.claim_token_hash.is_not(None), User.claimed_at.is_(None))
    ).all()
    user = next((u for u in candidates if verify_token(u.claim_token_hash, body.token)), None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid claim token")

    user.name = body.name
    user.password_hash = hash_password(body.password)
    user.claim_token_hash = None  # FR-A3: token consumed, single-use.
    user.claimed_at = datetime.now(PRAGUE_TZ)
    session.commit()

    _set_session_cookie(response, user.id)
    return MeResponse(id=user.id, name=user.name, is_admin=user.is_cook)


@router.post("/auth/login", response_model=MeResponse)
def login(body: LoginRequest, session: SessionDep, response: Response) -> MeResponse:
    """FR-A4: authenticate by name + password; bad credentials → 401."""
    user = session.scalar(select(User).where(User.name == body.name, User.claimed_at.is_not(None)))
    if (
        user is None
        or user.password_hash is None
        or not verify_password(user.password_hash, body.password)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    _set_session_cookie(response, user.id)
    return MeResponse(id=user.id, name=user.name, is_admin=user.is_cook)


@router.post("/auth/logout")
def logout(response: Response) -> dict[str, bool]:
    """FR-A4: end the session by clearing the cookie."""
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser) -> MeResponse:
    """FR-A6: report who the user is and whether they are admin."""
    return MeResponse(id=user.id, name=user.name, is_admin=user.is_cook)


@router.get("/users", response_model=list[UserResponse])
def list_users(_user: CurrentUser, session: SessionDep) -> list[User]:
    """Members roster: id + name + is_admin for every household member.

    Available to any logged-in user so the FE can display names (T-4.3, T-7.3).
    Sensitive fields (password_hash, claim_token_hash) are never returned.
    """
    return list(session.scalars(select(User).order_by(User.id)).all())


@router.post("/admin/users/{user_id}/claim-token", response_model=ClaimTokenResponse)
def generate_claim_token(
    user_id: int, _admin: AdminUser, session: SessionDep
) -> ClaimTokenResponse:
    """FR-A2: admin generates a single-use claim token for a member account."""
    target = session.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    token = secrets.token_urlsafe(32)
    target.claim_token_hash = hash_token(token)  # NFR-8: store hash only.
    session.commit()
    return ClaimTokenResponse(token=token)
