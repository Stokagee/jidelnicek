"""FastAPI dependencies: DB session, current user, permission guards.

``get_session`` is the seam the test suite overrides (see tests/fixtures/http.py)
to bind requests to the per-test transaction.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from api.security import read_session
from shared.config import get_settings
from shared.db import get_sessionmaker
from shared.models import User


def get_session() -> Iterator[Session]:
    session = get_sessionmaker()()
    try:
        yield session
    finally:
        session.close()


SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(request: Request, session: SessionDep) -> User:
    """Resolve the logged-in user from the session cookie (FR-A5/FR-A6).

    Rejects unauthenticated requests with 401 — they see no data (FR-A5).
    """
    cookie = request.cookies.get(get_settings().session_cookie_name)
    user_id = read_session(cookie)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = session.get(User, user_id)
    if user is None or user.claimed_at is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    """Admin = the single ``is_cook=true`` user (glossary). 403 otherwise."""
    if not user.is_cook:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
