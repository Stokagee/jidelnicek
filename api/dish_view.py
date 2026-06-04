"""Shape active dishes with their active signups for read endpoints (FR-K3).

Active-only (BR-7): soft-deleted dishes and signups are excluded.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.schemas.signup import SignupWithUserName
from api.schemas.week import DishWithSignupsResponse
from shared.models import Dish, Signup, User


def _attach_signups(session: Session, dishes: list[Dish]) -> list[DishWithSignupsResponse]:
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


def dishes_for_week(session: Session, week_id: int) -> list[DishWithSignupsResponse]:
    """Active dishes of a week, each with their active signups (FR-K3)."""
    dishes = list(
        session.scalars(
            select(Dish)
            .where(Dish.week_id == week_id, Dish.deleted_at.is_(None))  # BR-7: active only
            .order_by(Dish.start_date, Dish.id)
        ).all()
    )
    return _attach_signups(session, dishes)


def dishes_in_range(session: Session, start: date, end: date) -> list[DishWithSignupsResponse]:
    """Active dishes whose day-block intersects [start, end], each with their active
    signups — the read behind the 30-day week/month browser (#80). Spans weeks."""
    dishes = list(
        session.scalars(
            select(Dish)
            .where(
                Dish.deleted_at.is_(None),  # BR-7: active only
                Dish.start_date <= end,
                Dish.end_date >= start,
            )
            .order_by(Dish.start_date, Dish.id)
        ).all()
    )
    return _attach_signups(session, dishes)
