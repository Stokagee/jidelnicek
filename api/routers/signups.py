"""Signup endpoints (EP-6 / FR-S).

Business rules in the application layer (BR-8): day-in-block (BR-2), one active
signup per (dish, user, day) via upsert (BR-3), portions >= 1 (BR-4, also a DB
check), cancellation as soft-delete (BR-7).
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from api.deps import CurrentUser, SessionDep
from api.schemas.signup import SignupCreate, SignupResponse, SignupUpdate
from shared.models import Dish, Signup

PRAGUE_TZ = ZoneInfo("Europe/Prague")

router = APIRouter(tags=["signups"])


def _load_owned_signup(session: SessionDep, signup_id: int, user_id: int) -> Signup:
    """Load an active signup owned by the caller, else 404/403."""
    signup = session.get(Signup, signup_id)
    if signup is None or signup.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signup not found")
    # Owner-only (FR-S4/FR-S5).
    if signup.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your signup")
    return signup


@router.post("/signups", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def create_signup(
    body: SignupCreate, user: CurrentUser, session: SessionDep, response: Response
) -> SignupResponse:
    """FR-S1/FR-S2/FR-S3: sign up for a dish on a day inside its block."""
    dish = session.get(Dish, body.dish_id)
    if dish is None or dish.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dish not found")

    # BR-2: the chosen day must lie within the dish's block.
    if not (dish.start_date <= body.day <= dish.end_date):
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail="day must lie within the dish block",
        )

    # BR-3: at most one active signup per (dish, user, day) — upsert the active row
    # rather than duplicating (AC-3).
    existing = session.scalar(
        select(Signup).where(
            Signup.dish_id == dish.id,
            Signup.user_id == user.id,
            Signup.day == body.day,
            Signup.deleted_at.is_(None),
        )
    )
    if existing is not None:
        existing.portions = body.portions
        session.commit()
        response.status_code = status.HTTP_200_OK
        return SignupResponse.model_validate(existing)

    signup = Signup(dish_id=dish.id, user_id=user.id, day=body.day, portions=body.portions)
    session.add(signup)
    session.commit()
    return SignupResponse.model_validate(signup)


@router.patch("/signups/{signup_id}", response_model=SignupResponse)
def update_signup(
    signup_id: int, body: SignupUpdate, user: CurrentUser, session: SessionDep
) -> SignupResponse:
    """FR-S4: the owner changes the portion count (including lowering it)."""
    signup = _load_owned_signup(session, signup_id, user.id)
    signup.portions = body.portions  # BR-4 enforced by schema + DB check.
    session.commit()
    return SignupResponse.model_validate(signup)


@router.delete("/signups/{signup_id}", status_code=status.HTTP_200_OK)
def delete_signup(signup_id: int, user: CurrentUser, session: SessionDep) -> dict[str, bool]:
    """FR-S5 (BR-7): cancellation is a soft-delete (= unregister)."""
    signup = _load_owned_signup(session, signup_id, user.id)
    signup.deleted_at = datetime.now(PRAGUE_TZ)  # BR-7: soft-delete.
    session.commit()
    return {"ok": True}
