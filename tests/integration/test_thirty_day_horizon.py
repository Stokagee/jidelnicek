"""30-day planning horizon — tests-first (issue #80).

"Order food for the next 30 days starting today": dishes (and therefore signups)
may be planned for any day in [today, today+30] (Europe/Prague, BR-9), spanning
several ISO weeks. The week row for a future date is derived from the date and
auto-created on demand (BR-1: no chooser assigned), and a range read endpoint
feeds the week/month browser.

This is purely a *horizon* change: who may create a dish is unchanged (BR-6, or
anyone when open_choosing is on — #77). On a future week nobody is the chooser,
so in closed mode only the admin can plan ahead; open_choosing opens it to all.

The date-driven path (POST /dishes without a week_id) is new; the legacy by-id
path (week_id given) is untouched, so the existing dish/week suites still hold.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from shared.models import Dish, User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD

PRAGUE_TZ = ZoneInfo("Europe/Prague")


def _today() -> date:
    return datetime.now(PRAGUE_TZ).date()


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _login(login: Callable[[str, str], object], user: User) -> None:
    assert login(user.name, DEFAULT_PASSWORD).status_code == 200


def _enable_open_choosing(client, login, admin: User) -> None:
    _login(login, admin)
    assert client.put("/settings", json={"open_choosing": True}).status_code == 200


# --------------------------------------------------------------------------- #
# POST /dishes — date-driven creation across the 30-day horizon (#80)         #
# --------------------------------------------------------------------------- #


def test_admin_plans_dish_three_weeks_ahead_autocreates_week_issue80(
    db_session,
    admin_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80: the admin creates a dish ~20 days ahead by date alone (no week_id);
    the owning future week is auto-created (BR-1: no chooser)."""
    _login(login, admin_user)
    day = _today() + timedelta(days=20)

    response = client.post(
        "/dishes",
        json={"name": "Svíčková", "start_date": day.isoformat(), "end_date": day.isoformat()},
    )
    assert response.status_code == 201

    week = db_session.scalar(select(Week).where(Week.start_date == _monday_of(day)))
    assert week is not None
    assert week.chooser_id is None  # BR-1: mechanism only, no chooser on auto-created weeks
    assert response.json()["week_id"] == week.id


def test_plan_dish_beyond_horizon_is_rejected_issue80(
    db_session,
    admin_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80: a dish whose block reaches past today+30 is refused (422)."""
    _login(login, admin_user)
    day = _today() + timedelta(days=31)

    response = client.post(
        "/dishes",
        json={"name": "Příliš daleko", "start_date": day.isoformat(), "end_date": day.isoformat()},
    )
    assert response.status_code == 422


def test_plan_dish_crossing_iso_week_is_rejected_issue80(
    db_session,
    admin_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80: a date-driven dish block must lie within a single ISO week (the block
    maps to exactly one auto-derived week row)."""
    _login(login, admin_user)
    today = _today()
    sunday = today + timedelta(days=(6 - today.weekday()))  # next Sunday within the window
    monday = sunday + timedelta(days=1)  # crosses into the next ISO week

    response = client.post(
        "/dishes",
        json={
            "name": "Přes týden",
            "start_date": sunday.isoformat(),
            "end_date": monday.isoformat(),
        },
    )
    assert response.status_code == 422


def test_member_cannot_plan_future_dish_in_closed_mode_issue80(
    db_session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80 keeps BR-6: a future week has no chooser, so in closed mode a plain
    member cannot plan ahead — only the admin can."""
    member = make_user(name="member")
    day = _today() + timedelta(days=15)
    payload = {"name": "Guláš", "start_date": day.isoformat(), "end_date": day.isoformat()}

    _login(login, member)
    assert client.post("/dishes", json=payload).status_code == 403

    _login(login, admin_user)
    assert client.post("/dishes", json=payload).status_code == 201


def test_member_can_plan_future_dish_in_open_mode_issue80(
    db_session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80 + #77: with open_choosing on, any member may plan a future dish."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)

    _login(login, member)
    day = _today() + timedelta(days=10)
    response = client.post(
        "/dishes",
        json={"name": "Čočka", "start_date": day.isoformat(), "end_date": day.isoformat()},
    )
    assert response.status_code == 201


def test_member_can_order_food_on_a_future_dish_issue80(
    db_session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80 end-to-end: once the admin has planned a future dish, a member can order
    portions on that future day (BR-2 day-in-block holds unchanged)."""
    member = make_user(name="member")
    day = _today() + timedelta(days=18)

    _login(login, admin_user)
    created = client.post(
        "/dishes",
        json={"name": "Rajská", "start_date": day.isoformat(), "end_date": day.isoformat()},
    )
    assert created.status_code == 201
    dish_id = created.json()["id"]

    _login(login, member)
    ordered = client.post(
        "/signups", json={"dish_id": dish_id, "day": day.isoformat(), "portions": 2}
    )
    assert ordered.status_code in (200, 201)


# --------------------------------------------------------------------------- #
# GET /dishes?start=&end= — the week/month browser read (#80)                 #
# --------------------------------------------------------------------------- #


def test_list_dishes_in_range_spans_weeks_with_signups_issue80(
    db_session,
    test_user: User,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., object],
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80: GET /dishes?start=&end= returns active dishes across several weeks,
    each with its active signups — the data behind the week/month browser."""
    this_week = make_week()  # current Monday
    next_week = make_week()  # +1 week (factory auto-offsets)
    dish_now = make_dish(week=this_week, proposed_by=test_user, start_date=this_week.start_date)
    dish_next = make_dish(week=next_week, proposed_by=test_user, start_date=next_week.start_date)
    make_signup(dish=dish_now, user=test_user, day=this_week.start_date, portions=3)

    _login(login, test_user)
    start = this_week.start_date
    end = next_week.start_date + timedelta(days=6)
    response = client.get(f"/dishes?start={start.isoformat()}&end={end.isoformat()}")
    assert response.status_code == 200

    body = response.json()
    by_id = {d["id"]: d for d in body}
    assert dish_now.id in by_id and dish_next.id in by_id
    assert sum(s["portions"] for s in by_id[dish_now.id]["signups"]) == 3
    assert by_id[dish_next.id]["signups"] == []


# --------------------------------------------------------------------------- #
# GET /dishes/{id} — load a single dish in any week (#80)                      #
# --------------------------------------------------------------------------- #


def test_get_dish_returns_a_future_dish_with_signups_issue80(
    db_session,
    test_user: User,
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    make_signup: Callable[..., object],
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80: a single future dish (with its signups) is loadable by id — this is
    what lets signup/edit screens act on a dish outside the current week."""
    make_week()  # current week (offset 0)
    future = make_week()  # +1 week
    dish = make_dish(week=future, proposed_by=test_user, start_date=future.start_date)
    make_signup(dish=dish, user=test_user, day=future.start_date, portions=4)

    _login(login, test_user)
    response = client.get(f"/dishes/{dish.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == dish.id
    assert sum(s["portions"] for s in body["signups"]) == 4


def test_get_dish_404_for_missing_dish_issue80(
    db_session,
    test_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """#80: an unknown (or soft-deleted) dish is a 404, not a redirect-to-home."""
    _login(login, test_user)
    assert client.get("/dishes/999999").status_code == 404
