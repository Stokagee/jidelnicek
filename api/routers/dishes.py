"""Dish endpoints (EP-5 / FR-D). `POST /dishes` also exercised by EP-4.

Permission model:
- create (BR-6): admin or the week's chooser.
- edit/delete (BR-5): the proposer or the admin.
Soft-delete (BR-7) on DELETE. Business rules live here, not in DB triggers (BR-8).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from api.app_settings import get_app_settings
from api.deps import CurrentUser, SessionDep
from api.dish_view import dishes_in_range
from api.outbox import write_notification
from api.schemas.dish import DishCreate, DishResponse, DishUpdate
from api.schemas.week import DishWithSignupsResponse
from shared.models import Dish, NotificationType, User, Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")

#: #80: how far ahead (days from today, Europe/Prague) a dish may be planned.
SELECTION_HORIZON_DAYS = 30

router = APIRouter(tags=["dishes"])


def _monday_of(d: date) -> date:
    """BR-9: the Monday of d's ISO week (Europe/Prague dates are passed in)."""
    return d - timedelta(days=d.weekday())


def _ensure_week_for_date(session: SessionDep, d: date) -> Week:
    """Get or create the week row whose Monday owns date d (#80; BR-1: no chooser
    is assigned here — that stays a separate policy)."""
    monday = _monday_of(d)
    week = session.scalar(select(Week).where(Week.start_date == monday))
    if week is None:
        week = Week(start_date=monday, chooser_id=None)
        session.add(week)
        session.flush()
    return week


def _resolve_planning_week(session: SessionDep, body: DishCreate) -> Week:
    """Resolve the week a new dish belongs to.

    Legacy by-id path (week_id given): unchanged — the week must exist.
    Date-driven path (#80, week_id omitted): the block must lie within the next
    30 days [today, today+30] (BR-9) and within a single ISO week; its week row is
    derived and auto-created.
    """
    if body.week_id is not None:
        week = session.get(Week, body.week_id)
        if week is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")
        return week

    today = datetime.now(PRAGUE_TZ).date()
    horizon_end = today + timedelta(days=SELECTION_HORIZON_DAYS)
    if body.start_date < today or body.end_date > horizon_end:
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail=f"dish must fall within the next {SELECTION_HORIZON_DAYS} days",
        )
    if _monday_of(body.start_date) != _monday_of(body.end_date):
        raise HTTPException(
            status_code=422, detail="a dish block must lie within a single ISO week"
        )
    return _ensure_week_for_date(session, body.start_date)


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


@router.get("/dishes", response_model=list[DishWithSignupsResponse])
def list_dishes(
    start: date, end: date, _user: CurrentUser, session: SessionDep
) -> list[DishWithSignupsResponse]:
    """#80: active dishes (with signups) whose block intersects [start, end] — the
    read behind the 30-day week/month browser, which spans weeks."""
    return dishes_in_range(session, start, end)


@router.post("/dishes", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(body: DishCreate, user: CurrentUser, session: SessionDep) -> DishResponse:
    """FR-D1/FR-D2: create a dish (name + day block).

    BR-6: only the admin or the week's chooser may create a dish — unless the
    `open_choosing` button is on (#77), which lets anyone create, permanently.
    The week is given (legacy) or derived from the date within the next 30 days
    (#80); permission is then checked against the resolved week's chooser, so a
    future week (no chooser) is admin-only in closed mode.
    """
    if body.end_date < body.start_date:
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail="end_date must not precede start_date",
        )

    week = _resolve_planning_week(session, body)

    # BR-6, unless the admin turned open choosing on (#77: everyone, for good).
    open_choosing = get_app_settings(session).open_choosing
    if not open_choosing and not user.is_cook and week.chooser_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or week chooser may add dishes",
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
