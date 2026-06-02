"""Open choosing + 30-day horizon - tests-first (issue #77, #80).

A global, admin-flipped toggle (`open_choosing`) opens dish creation to everyone
(#77) and, while on, lets meals be planned across the next 30 days (#80) instead
of just the current week. The new rules are **gated entirely behind the toggle**:
with it off, behaviour is exactly as before (BR-6: only admin/chooser, current
week, lunch only), so the rest of the suite is unaffected.

Open mode (toggle on):
- any logged-in user may create a dish;
- each dish carries a `slot` (lunch/dinner);
- at most one **active** dish per (calendar day, slot) - dishes are day blocks,
  so two same-slot dishes may not overlap on any day (BR-8, app layer);
- the block must lie within a single ISO week and within [today, today+30]
  (Europe/Prague, BR-9); the week row is derived from the date and auto-created.

`GET /dishes?start=&end=` returns the active dishes in a date range (with slot
and active signups) for the 30-day grid.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.models import User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD


def _enable_open_choosing(client, login, admin: User) -> None:
    assert login(admin.name, DEFAULT_PASSWORD).status_code == 200
    assert client.put("/settings", json={"open_choosing": True}).status_code == 200


def _dish_payload(
    *, name: str, start: date, end: date, slot: str = "lunch", week_id: int | None = None
) -> dict:
    body: dict = {
        "name": name,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "slot": slot,
    }
    if week_id is not None:
        body["week_id"] = week_id
    return body


# --------------------------------------------------------------------------- #
# Settings toggle (#77)                                                        #
# --------------------------------------------------------------------------- #


def test_settings_open_choosing_defaults_false(
    db_session: Session,
    test_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """The feature ships off: a fresh install reports open_choosing = false."""
    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.get("/settings")
    assert response.status_code == 200
    assert response.json()["open_choosing"] is False


def test_admin_enables_open_choosing(
    db_session: Session,
    admin_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """#77: the admin's button turns the toggle on, and it sticks."""
    _enable_open_choosing(client, login, admin_user)
    assert client.get("/settings").json()["open_choosing"] is True


def test_non_admin_cannot_change_settings(
    db_session: Session,
    test_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """Only the admin flips the toggle; a member is forbidden."""
    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    assert client.put("/settings", json={"open_choosing": True}).status_code == 403


# --------------------------------------------------------------------------- #
# Open mode opens creation to everyone (#77)                                   #
# --------------------------------------------------------------------------- #


def test_open_mode_lets_any_member_create_dish(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#77: with the toggle on, a plain member (not admin, not chooser) may create
    a dish for any day."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    monday = date(2026, 1, 5)  # the frozen current week
    response = client.post(
        "/dishes", json=_dish_payload(name="Svíčková", start=monday, end=monday + timedelta(days=2))
    )
    assert response.status_code == 201


def test_closed_mode_still_blocks_non_chooser_BR6(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """Regression: with the toggle off, BR-6 still applies - a non-chooser member
    cannot create a dish."""
    outsider = make_user(name="outsider")
    week = make_week()
    assert login(outsider.name, DEFAULT_PASSWORD).status_code == 200
    response = client.post(
        "/dishes",
        json=_dish_payload(
            name="Guláš",
            start=week.start_date,
            end=week.start_date + timedelta(days=2),
            week_id=week.id,
        ),
    )
    assert response.status_code == 403


# --------------------------------------------------------------------------- #
# One active dish per (day, slot) - the collision rule (#77)                   #
# --------------------------------------------------------------------------- #


def test_open_mode_rejects_second_lunch_overlapping_a_day(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#77: only one lunch per day. A lunch on Mon-Wed blocks another lunch that
    covers any of those days (here Wed)."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    mon = date(2026, 1, 5)
    assert (
        client.post(
            "/dishes", json=_dish_payload(name="Guláš", start=mon, end=mon + timedelta(days=2))
        ).status_code
        == 201
    )
    # Wed-Fri overlaps Wed -> rejected.
    clash = client.post(
        "/dishes",
        json=_dish_payload(
            name="Pizza", start=mon + timedelta(days=2), end=mon + timedelta(days=4)
        ),
    )
    assert clash.status_code == 409


def test_open_mode_allows_non_overlapping_lunches(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#77 (user's example): lunch Mon-Wed, then another lunch Thu-Sat is fine - no
    shared day."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    mon = date(2026, 1, 5)
    assert (
        client.post(
            "/dishes", json=_dish_payload(name="Guláš", start=mon, end=mon + timedelta(days=2))
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/dishes",
            json=_dish_payload(
                name="Rizoto", start=mon + timedelta(days=3), end=mon + timedelta(days=5)
            ),
        ).status_code
        == 201
    )


def test_open_mode_allows_lunch_and_dinner_same_day(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#77: lunch and dinner are separate - both may exist on the same day."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    mon = date(2026, 1, 5)
    assert (
        client.post(
            "/dishes",
            json=_dish_payload(name="Guláš", start=mon, end=mon + timedelta(days=2), slot="lunch"),
        ).status_code
        == 201
    )
    response = client.post(
        "/dishes",
        json=_dish_payload(name="Polévka", start=mon, end=mon + timedelta(days=2), slot="dinner"),
    )
    assert response.status_code == 201
    assert response.json()["slot"] == "dinner"


# --------------------------------------------------------------------------- #
# 30-day horizon + week derivation (#80)                                       #
# --------------------------------------------------------------------------- #


def test_open_mode_creates_dish_in_future_week_deriving_week(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#80: a dish two weeks out (no week_id sent) is accepted; its week row is
    derived from the date and auto-created."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    future_mon = date(2026, 1, 19)  # +2 weeks, inside the 30-day window
    assert db_session.scalar(select(Week).where(Week.start_date == future_mon)) is None

    response = client.post(
        "/dishes",
        json=_dish_payload(name="Čočka", start=future_mon, end=future_mon + timedelta(days=1)),
    )
    assert response.status_code == 201
    assert db_session.scalar(select(Week).where(Week.start_date == future_mon)) is not None


def test_open_mode_rejects_dish_beyond_30_days(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#80: the horizon is 30 days from today; a date past it is rejected."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    far = date(2026, 1, 5) + timedelta(days=40)
    response = client.post("/dishes", json=_dish_payload(name="Daleko", start=far, end=far))
    assert response.status_code == 422


def test_open_mode_rejects_dish_in_the_past(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#80: you order food going forward, not for days already gone."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    past = date(2026, 1, 5) - timedelta(days=1)
    response = client.post("/dishes", json=_dish_payload(name="Včera", start=past, end=past))
    assert response.status_code == 422


def test_open_mode_rejects_block_spanning_two_weeks(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """A dish block binds to one week, so it must stay within a single ISO week."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    sat = date(2026, 1, 10)  # Sat of the current week; +2 days crosses into next week
    response = client.post(
        "/dishes", json=_dish_payload(name="Přes víkend", start=sat, end=sat + timedelta(days=2))
    )
    assert response.status_code == 422


def test_calendar_returns_dishes_in_range(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    client,
    login: Callable[[str, str], object],
    frozen_clock,
) -> None:
    """#80: the 30-day grid reads dishes across weeks via GET /dishes?start=&end=."""
    member = make_user(name="member")
    _enable_open_choosing(client, login, admin_user)
    assert login(member.name, DEFAULT_PASSWORD).status_code == 200

    mon = date(2026, 1, 5)
    client.post("/dishes", json=_dish_payload(name="Guláš", start=mon, end=mon + timedelta(days=1)))
    far_mon = date(2026, 1, 19)
    client.post(
        "/dishes", json=_dish_payload(name="Čočka", start=far_mon, end=far_mon, slot="dinner")
    )

    response = client.get(
        "/dishes", params={"start": mon.isoformat(), "end": (mon + timedelta(days=30)).isoformat()}
    )
    assert response.status_code == 200
    names = {d["name"] for d in response.json()}
    assert {"Guláš", "Čočka"} <= names
