"""Dish endpoints (EP-5 / FR-D). `POST /dishes` also exercised by EP-4.

Permission model:
- create (BR-6): admin or the week's chooser.
- edit/delete (BR-5): the proposer or the admin.
Soft-delete (BR-7) on DELETE. Business rules live here, not in DB triggers (BR-8).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from api.deps import CurrentUser, SessionDep
from api.schemas.dish import DishCreate, DishResponse
from shared.models import Dish, User, Week

router = APIRouter(tags=["dishes"])


def _admin_id(session: SessionDep) -> int | None:
    """The single is_cook=true user — V1 default cook for every dish (§11)."""
    return session.scalar(select(User.id).where(User.is_cook.is_(True)))


@router.post("/dishes", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(body: DishCreate, user: CurrentUser, session: SessionDep) -> DishResponse:
    """FR-D1/FR-D2: create a dish (name + day block) for a week.

    BR-6: only the admin or the week's chooser may create a dish in that week.
    """
    week = session.get(Week, body.week_id)
    if week is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")

    # BR-6: admin or chooser-of-week.
    if not user.is_cook and week.chooser_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or week chooser may add dishes",
        )

    if body.end_date < body.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date must not precede start_date",
        )

    dish = Dish(
        week_id=week.id,
        name=body.name,
        proposed_by_id=user.id,
        # FR-D3/§11: cook is always the admin in V1 (falls back to the proposer when
        # no admin exists, e.g. in isolated tests); slot defaults to lunch (model).
        cook_id=_admin_id(session) or user.id,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    session.add(dish)
    session.commit()
    return DishResponse.model_validate(dish)
