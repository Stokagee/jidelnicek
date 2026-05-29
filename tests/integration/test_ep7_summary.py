"""EP-7 · Cook summary (FR-K) — tests-first (T-7.1).

Written before the endpoint (T-7.2); needs EP-3 auth, so xfail(strict=True)
until both land. Signups are set up via the factory; the endpoint aggregates.

Assumed endpoint contract for T-7.2 (spec §9):
- GET /summary?week=<week_id>&day=<iso date>  -> 200, admin only (else 403)
  Returns the per-dish active-portion totals for that day, e.g.
  `[{"dish_id": int, "name": str, "portions": int}, ...]`.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from shared.models import Dish, Signup, User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD

PRAGUE_TZ = ZoneInfo("Europe/Prague")


def _portions_for(response, dish_id: int) -> int:
    """Pull the per-day total for a dish out of the summary payload."""
    for entry in response.json():
        if entry["dish_id"] == dish_id:
            return entry["portions"]
    raise AssertionError(f"dish {dish_id} not in summary {response.json()}")


def test_day_summary_sums_active_portions_including_admin_AC4(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., Signup],
    client,
    login: Callable[[str, str], object],
) -> None:
    """AC-4 (FR-K1, FR-K2): Tuesday has signups of 2 + 1 plus the admin's own 2,
    so the summary for Tuesday shows 5."""
    week = make_week()
    dish = make_dish(week=week, proposed_by=admin_user)
    tuesday = dish.start_date + timedelta(days=1)
    member_a = make_user(name="a")
    member_b = make_user(name="b")
    make_signup(dish=dish, user=member_a, day=tuesday, portions=2)
    make_signup(dish=dish, user=member_b, day=tuesday, portions=1)
    make_signup(dish=dish, user=admin_user, day=tuesday, portions=2)

    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.get(f"/summary?week={week.id}&day={tuesday.isoformat()}")
    assert response.status_code == 200
    assert _portions_for(response, dish.id) == 5


def test_summary_excludes_soft_deleted_signups_FRK1(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., Signup],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-K1: only active signups count — a cancelled (soft-deleted) one is excluded."""
    week = make_week()
    dish = make_dish(week=week, proposed_by=admin_user)
    day = dish.start_date
    make_signup(dish=dish, user=admin_user, day=day, portions=2)
    cancelled = make_signup(dish=dish, user=make_user(name="gone"), day=day, portions=4)
    cancelled.deleted_at = datetime.now(PRAGUE_TZ)
    db_session.flush()

    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.get(f"/summary?week={week.id}&day={day.isoformat()}")
    assert response.status_code == 200
    assert _portions_for(response, dish.id) == 2


def test_summary_is_broken_down_by_day_FRK3(
    db_session: Session,
    admin_user: User,
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., Signup],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-K3: the summary is shown per day within the chosen week."""
    week = make_week()
    dish = make_dish(week=week, proposed_by=admin_user)
    monday = dish.start_date
    tuesday = dish.start_date + timedelta(days=1)
    make_signup(dish=dish, user=admin_user, day=monday, portions=1)
    make_signup(dish=dish, user=admin_user, day=tuesday, portions=3)

    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    monday_resp = client.get(f"/summary?week={week.id}&day={monday.isoformat()}")
    tuesday_resp = client.get(f"/summary?week={week.id}&day={tuesday.isoformat()}")
    assert _portions_for(monday_resp, dish.id) == 1
    assert _portions_for(tuesday_resp, dish.id) == 3


def test_summary_is_admin_only_FRK1(
    db_session: Session,
    test_user: User,
    current_week: Week,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-K1: the summary is the cook's view — a non-admin member is forbidden."""
    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.get(f"/summary?week={current_week.id}&day={current_week.start_date.isoformat()}")
    assert response.status_code == 403
