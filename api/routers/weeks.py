"""Week & chooser endpoints (EP-4 / FR-W)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from api.deps import AdminUser, CurrentUser, SessionDep
from api.schemas.signup import SignupWithUserName
from api.schemas.week import DishWithSignupsResponse, SetChooserRequest, WeekResponse
from shared.models import Dish, Signup, User, Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")

router = APIRouter(tags=["weeks"])


def current_monday() -> date:
    """BR-9: the current week's Monday, computed in Europe/Prague."""
    today = datetime.now(PRAGUE_TZ).date()
    return today - timedelta(days=today.weekday())


def _dishes_with_signups(session: SessionDep, week_id: int) -> list[DishWithSignupsResponse]:
    """FR-K3: dishes for a week, each carrying their active signups with user names."""
    dishes = list(
        session.scalars(
            select(Dish)
            .where(Dish.week_id == week_id, Dish.deleted_at.is_(None))  # BR-7: active only
            .order_by(Dish.start_date, Dish.id)
        ).all()
    )
    if not dishes:
        return []

    dish_ids = [d.id for d in dishes]
    rows = session.execute(
        select(Signup, User.name.label("user_name"))
        .join(User, User.id == Signup.user_id)
        .where(Signup.dish_id.in_(dish_ids), Signup.deleted_at.is_(None))  # BR-7: active only
        .order_by(Signup.day, Signup.id)
    ).all()

    signups_by_dish: dict[int, list[SignupWithUserName]] = {}
    for signup, user_name in rows:
        signups_by_dish.setdefault(signup.dish_id, []).append(
            SignupWithUserName(
                id=signup.id,
                user_id=signup.user_id,
                user_name=user_name,
                day=signup.day,
                portions=signup.portions,
            )
        )

    return [
        DishWithSignupsResponse(
            id=d.id,
            week_id=d.week_id,
            name=d.name,
            proposed_by_id=d.proposed_by_id,
            cook_id=d.cook_id,
            slot=d.slot,
            start_date=d.start_date,
            end_date=d.end_date,
            signups=signups_by_dish.get(d.id, []),
        )
        for d in dishes
    ]


@router.get("/weeks/current", response_model=WeekResponse)
def get_current_week(_user: CurrentUser, session: SessionDep) -> WeekResponse:
    """FR-W1: the current week, identified by its Monday start date (BR-9)."""
    week = session.scalar(select(Week).where(Week.start_date == current_monday()))
    if week is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No current week")
    return WeekResponse(
        id=week.id,
        start_date=week.start_date,
        chooser_id=week.chooser_id,
        chooser_start_date=week.chooser_start_date,
        chooser_end_date=week.chooser_end_date,
        dishes=_dishes_with_signups(session, week.id),
    )


@router.put("/weeks/{week_id}/chooser", response_model=WeekResponse)
def set_chooser(
    week_id: int, body: SetChooserRequest, _admin: AdminUser, session: SessionDep
) -> WeekResponse:
    """FR-W2/FR-W3 (BR-1): admin sets/changes the week's chooser and their days."""
    week = session.get(Week, week_id)
    if week is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")
    week.chooser_id = body.chooser_id  # BR-1: pure mechanism, no policy.
    week.chooser_start_date = body.chooser_start_date
    week.chooser_end_date = body.chooser_end_date
    session.commit()
    return WeekResponse(
        id=week.id,
        start_date=week.start_date,
        chooser_id=week.chooser_id,
        chooser_start_date=week.chooser_start_date,
        chooser_end_date=week.chooser_end_date,
        dishes=_dishes_with_signups(session, week.id),
    )
