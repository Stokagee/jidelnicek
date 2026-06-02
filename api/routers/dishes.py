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
from shared.models import Dish, DishSlot, NotificationType, User, Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")

#: #80: how far ahead (days from today, Europe/Prague) dishes may be planned.
SELECTION_HORIZON_DAYS = 30

router = APIRouter(tags=["dishes"])


def _monday_of(d: date) -> date:
    """BR-9: the Monday of d's ISO week (Europe/Prague dates are passed in)."""
    return d - timedelta(days=d.weekday())


def _ensure_week_for_date(session: SessionDep, d: date) -> Week:
    """Get or create the week row whose Monday owns date d (#80 horizon, BR-1: no
    chooser assigned here)."""
    monday = _monday_of(d)
    week = session.scalar(select(Week).where(Week.start_date == monday))
    if week is None:
        week = Week(start_date=monday, chooser_id=None)
        session.add(week)
        session.flush()
    return week


def _slot_day_taken(session: SessionDep, slot: DishSlot, start: date, end: date) -> bool:
    """#77: is there already an active dish of this slot covering any day in
    [start, end]? Dishes are day blocks, so this is a range overlap."""
    clash = session.scalar(
        select(Dish.id)
        .where(
            Dish.slot == slot,
            Dish.deleted_at.is_(None),  # BR-7: active only
            Dish.start_date <= end,
            Dish.end_date >= start,
        )
        .limit(1)
    )
    return clash is not None


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


def _resolve_week_open_mode(session: SessionDep, body: DishCreate) -> Week:
    """Open mode (#77/#80): validate the block sits in the next 30 days and within a
    single ISO week, then resolve (or auto-create) its week. No BR-6 check —
    anyone may create — and no chooser is assigned (BR-1)."""
    today = datetime.now(PRAGUE_TZ).date()
    horizon_end = today + timedelta(days=SELECTION_HORIZON_DAYS)
    if body.start_date < today or body.end_date > horizon_end:
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail=f"dish must fall within the next {SELECTION_HORIZON_DAYS} days",
        )
    if _monday_of(body.start_date) != _monday_of(body.end_date):
        raise HTTPException(
            status_code=422,
            detail="a dish block must lie within a single ISO week",
        )
    # #77: at most one active dish per (day, slot).
    if _slot_day_taken(session, body.slot, body.start_date, body.end_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"another {body.slot.value} dish already covers one of these days",
        )
    if body.week_id is not None:
        week = session.get(Week, body.week_id)
        if week is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")
        return week
    return _ensure_week_for_date(session, body.start_date)


def _resolve_week_closed_mode(session: SessionDep, body: DishCreate, user: User) -> Week:
    """Closed mode: the pre-#77 behaviour — a known week and BR-6 permission."""
    if body.week_id is None:
        raise HTTPException(status_code=422, detail="week_id is required")
    week = session.get(Week, body.week_id)
    if week is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")
    # BR-6: admin or chooser-of-week.
    if not user.is_cook and week.chooser_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or week chooser may add dishes",
        )
    return week


@router.get("/dishes", response_model=list[DishWithSignupsResponse])
def list_dishes(
    start: date, end: date, _user: CurrentUser, session: SessionDep
) -> list[DishWithSignupsResponse]:
    """#80: active dishes (with signups) whose block intersects [start, end] — the
    30-day planning grid reads across weeks here."""
    return dishes_in_range(session, start, end)


@router.post("/dishes", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(body: DishCreate, user: CurrentUser, session: SessionDep) -> DishResponse:
    """FR-D1/FR-D2: create a dish (name + day block) for a week.

    Closed mode (default): BR-6 — only the admin or the week's chooser. Open mode
    (#77, admin-toggled): anyone may create, picking a slot; at most one active
    dish per (day, slot), within the next 30 days (#80, BR-9).
    """
    if body.end_date < body.start_date:
        raise HTTPException(
            status_code=422,  # Unprocessable Content (literal: stable across Starlette versions).
            detail="end_date must not precede start_date",
        )

    if get_app_settings(session).open_choosing:
        week = _resolve_week_open_mode(session, body)
    else:
        week = _resolve_week_closed_mode(session, body, user)

    dish = Dish(
        week_id=week.id,
        name=body.name,
        proposed_by_id=user.id,
        # FR-D3/§11: cook is always the admin (falls back to the proposer when no
        # admin exists, e.g. in isolated tests).
        cook_id=_admin_id(session) or user.id,
        slot=body.slot,
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
