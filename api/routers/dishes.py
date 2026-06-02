"""Dish endpoints (EP-5 / FR-D). `POST /dishes` also exercised by EP-4.

Permission model:
- create (BR-6): admin or the week's chooser.
- edit/delete (BR-5): the proposer or the admin.
Soft-delete (BR-7) on DELETE. Business rules live here, not in DB triggers (BR-8).
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from api.app_settings import get_app_settings
from api.deps import CurrentUser, SessionDep
from api.outbox import write_notification
from api.schemas.dish import DishCreate, DishResponse, DishUpdate
from shared.models import Dish, NotificationType, User, Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")

router = APIRouter(tags=["dishes"])


def _load_active_dish(session: SessionDep, dish_id: int) -> Dish:
    """Load a non-soft-deleted dish or 404 (BR-7 read filter)."""
    dish = session.get(Dish, dish_id)
    if dish is None or dish.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dish not found")
    return dish


def _require_dish_editor(dish: Dish, user: User) -> None:
    """BR-5: only the proposer or the admin may edit/delete a dish."""
    if not user.is_cook and dish.proposed_by_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the proposer or the admin may modify this dish",
        )


def _admin_id(session: SessionDep) -> int | None:
    """The single is_cook=true user — V1 default cook for every dish (§11)."""
    return session.scalar(select(User.id).where(User.is_cook.is_(True)))


@router.post("/dishes", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(body: DishCreate, user: CurrentUser, session: SessionDep) -> DishResponse:
    """FR-D1/FR-D2: create a dish (name + day block) for a week.

    BR-6: only the admin or the week's chooser may create a dish — unless the
    `open_choosing` button is on (#77), which lets anyone create, permanently.
    """
    week = session.get(Week, body.week_id)
    if week is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")

    # BR-6, unless the admin turned open choosing on (#77: everyone, for good).
    open_choosing = get_app_settings(session).open_choosing
    if not open_choosing and not user.is_cook and week.chooser_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or week chooser may add dishes",
        )

    if body.end_date < body.start_date:
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail="end_date must not precede start_date",
        )

    dish = Dish(
        week_id=week.id,
        name=body.name,
        proposed_by_id=user.id,
        # FR-D3/§11: cook is always the admin (falls back to the proposer when no
        # admin exists, e.g. in isolated tests); slot stays lunch (model default).
        cook_id=_admin_id(session) or user.id,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    session.add(dish)
    session.flush()  # assign dish.id before referencing it in the outbox payload.
    # FR-N1/FR-N2: a newly proposed dish writes a dish_proposed outbox row in this tx.
    write_notification(
        session,
        type=NotificationType.DISH_PROPOSED,
        payload={
            "dish_id": dish.id,
            "week_id": dish.week_id,
            "name": dish.name,
            "proposed_by_id": dish.proposed_by_id,
            "start_date": dish.start_date.isoformat(),
            "end_date": dish.end_date.isoformat(),
        },
    )
    session.commit()
    return DishResponse.model_validate(dish)


@router.patch("/dishes/{dish_id}", response_model=DishResponse)
def update_dish(
    dish_id: int, body: DishUpdate, user: CurrentUser, session: SessionDep
) -> DishResponse:
    """FR-D5 (BR-5): the proposer or the admin may edit a dish."""
    dish = _load_active_dish(session, dish_id)
    _require_dish_editor(dish, user)

    data = body.model_dump(exclude_unset=True)
    new_start = data.get("start_date", dish.start_date)
    new_end = data.get("end_date", dish.end_date)
    if new_end < new_start:
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail="end_date must not precede start_date",
        )
    for field, value in data.items():
        setattr(dish, field, value)
    session.commit()
    return DishResponse.model_validate(dish)


@router.delete("/dishes/{dish_id}", status_code=status.HTTP_200_OK)
def delete_dish(dish_id: int, user: CurrentUser, session: SessionDep) -> dict[str, bool]:
    """FR-D5 (BR-5, BR-7): soft-delete a dish (proposer or admin only)."""
    dish = _load_active_dish(session, dish_id)
    _require_dish_editor(dish, user)
    dish.deleted_at = datetime.now(PRAGUE_TZ)  # BR-7: soft-delete, never hard-delete.
    session.commit()
    return {"ok": True}
