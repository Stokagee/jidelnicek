"""Week & chooser endpoints (EP-4 / FR-W)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from api.deps import AdminUser, CurrentUser, SessionDep
from api.dish_view import dishes_for_week
from api.schemas.week import SetChooserRequest, WeekResponse
from shared.models import Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")

router = APIRouter(tags=["weeks"])


def current_monday() -> date:
    """BR-9: the current week's Monday, computed in Europe/Prague."""
    today = datetime.now(PRAGUE_TZ).date()
    return today - timedelta(days=today.weekday())


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
        dishes=dishes_for_week(session, week.id),
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
        dishes=dishes_for_week(session, week.id),
    )
