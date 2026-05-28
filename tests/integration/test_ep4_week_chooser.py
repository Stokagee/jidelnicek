"""EP-4 · Week & chooser (FR-W) — tests-first (T-4.1).

Written before the endpoints (T-4.2); also needs EP-3 auth to log in, so these
stay xfail until both land. Behaviour is exercised through HTTP.

Assumed endpoint contract for T-4.2 (spec §9 / glossary — `volitel` -> `chooser`):
- GET  /weeks/current               -> 200 {id, start_date, chooser_id, ...}
- PUT  /weeks/{id}/chooser {chooser_id} -> 200 (admin only); non-admin -> 403
- POST /dishes {week_id, name, start_date, end_date} -> 201
      allowed for the admin or the week's chooser (BR-6); other members -> 403
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta

import pytest
from sqlalchemy.orm import Session

from shared.models import User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD

pytestmark = pytest.mark.xfail(
    reason="EP-4 week/chooser endpoints not implemented yet (T-4.2)",
    strict=True,
)


def _dish_payload(week: Week, name: str = "Guláš") -> dict:
    return {
        "week_id": week.id,
        "name": name,
        "start_date": week.start_date.isoformat(),
        "end_date": (week.start_date + timedelta(days=2)).isoformat(),
    }


def test_weeks_current_returns_monday_week_FRW1(
    db_session: Session,
    test_user: User,
    current_week: Week,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-W1: the current week is identified by its Monday start date."""
    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.get("/weeks/current")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == current_week.id
    assert body["start_date"] == current_week.start_date.isoformat()


def test_admin_sets_chooser_FRW2(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    current_week: Week,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-W2: the admin sets which member is the week's chooser (BR-1 mechanism)."""
    member = make_user(name="chooser")
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200

    response = client.put(f"/weeks/{current_week.id}/chooser", json={"chooser_id": member.id})
    assert response.status_code == 200
    assert client.get("/weeks/current").json()["chooser_id"] == member.id


def test_admin_can_change_chooser_FRW3(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    current_week: Week,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-W3: the admin may change the chooser at any time."""
    first = make_user(name="first")
    second = make_user(name="second")
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200

    client.put(f"/weeks/{current_week.id}/chooser", json={"chooser_id": first.id})
    client.put(f"/weeks/{current_week.id}/chooser", json={"chooser_id": second.id})
    assert client.get("/weeks/current").json()["chooser_id"] == second.id


def test_non_admin_cannot_set_chooser_FRW2(
    db_session: Session,
    test_user: User,
    make_user: Callable[..., User],
    current_week: Week,
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-W2: only the admin sets the chooser; a member is forbidden."""
    other = make_user(name="other")
    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.put(f"/weeks/{current_week.id}/chooser", json={"chooser_id": other.id})
    assert response.status_code == 403


def test_non_chooser_member_cannot_create_dish_AC5(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """AC-5 (FR-W4, BR-6): a member who is not the week's chooser cannot create a
    dish in that week."""
    chooser = make_user(name="chooser")
    outsider = make_user(name="outsider")
    week = make_week(chooser=chooser)

    assert login(outsider.name, DEFAULT_PASSWORD).status_code == 200
    response = client.post("/dishes", json=_dish_payload(week))
    assert response.status_code == 403


def test_chooser_can_create_dish_in_their_week_FRW4(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-W4 (BR-6): the week's chooser may create a dish in that week."""
    chooser = make_user(name="chooser")
    week = make_week(chooser=chooser)

    assert login(chooser.name, DEFAULT_PASSWORD).status_code == 200
    response = client.post("/dishes", json=_dish_payload(week))
    assert response.status_code in (200, 201)


def test_admin_can_create_dish_FRW4(
    db_session: Session,
    admin_user: User,
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-W4: the admin may create a dish in any week."""
    week = make_week()
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.post("/dishes", json=_dish_payload(week))
    assert response.status_code in (200, 201)
