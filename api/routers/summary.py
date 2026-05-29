"""Cook summary endpoint (EP-7 / FR-K).

Per-day, per-dish active-portion totals for a week. Admin only (FR-K1).
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter
from sqlalchemy import func, select

from api.deps import AdminUser, SessionDep
from api.schemas.summary import DishPortions
from shared.models import Dish, Signup

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=list[DishPortions])
def get_summary(week: int, day: date, _admin: AdminUser, session: SessionDep) -> list[DishPortions]:
    """FR-K1/FR-K2/FR-K3: sum active portions per dish for a given day in a week.

    Admin only (the cook's view). Sums every active signup — including the admin's
    own (FR-K2) — and excludes soft-deleted rows (FR-K1, BR-7).
    """
    rows = session.execute(
        select(Dish.id, Dish.name, func.sum(Signup.portions))
        .join(Signup, Signup.dish_id == Dish.id)
        .where(
            Dish.week_id == week,
            Signup.day == day,
            Signup.deleted_at.is_(None),  # FR-K1: active signups only.
            Dish.deleted_at.is_(None),
        )
        .group_by(Dish.id, Dish.name)
        .order_by(Dish.id)
    ).all()
    return [
        DishPortions(dish_id=d_id, name=name, portions=int(total)) for d_id, name, total in rows
    ]
