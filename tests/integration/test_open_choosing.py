"""Open choosing — tests-first (issue #77).

One admin-flipped, permanent toggle: `open_choosing`. When it is on, BR-6 is
relaxed so **anyone** may create dishes; when off, behaviour is exactly as before
(only the admin or the week's chooser). That's the whole feature — the 30-day
horizon (#80) is a separate, unrelated change.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta

from shared.models import User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD


def _enable_open_choosing(client, login, admin: User) -> None:
    assert login(admin.name, DEFAULT_PASSWORD).status_code == 200
    assert client.put("/settings", json={"open_choosing": True}).status_code == 200


def _dish_payload(week: Week, name: str = "Guláš") -> dict:
    return {
        "week_id": week.id,
        "name": name,
        "start_date": week.start_date.isoformat(),
        "end_date": (week.start_date + timedelta(days=2)).isoformat(),
    }


# --------------------------------------------------------------------------- #
# Settings toggle                                                             #
# --------------------------------------------------------------------------- #


def test_settings_open_choosing_defaults_false(
    db_session,
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
    db_session,
    admin_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """#77: the admin's button turns the toggle on, and it sticks."""
    _enable_open_choosing(client, login, admin_user)
    assert client.get("/settings").json()["open_choosing"] is True


def test_non_admin_cannot_change_settings(
    db_session,
    test_user: User,
    client,
    login: Callable[[str, str], object],
) -> None:
    """Only the admin flips the toggle; a member is forbidden."""
    assert login(test_user.name, DEFAULT_PASSWORD).status_code == 200
    assert client.put("/settings", json={"open_choosing": True}).status_code == 403


# --------------------------------------------------------------------------- #
# The toggle relaxes BR-6 for everyone                                        #
# --------------------------------------------------------------------------- #


def test_open_mode_lets_any_member_create_dish(
    db_session,
    admin_user: User,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """#77: with the toggle on, a plain member (not admin, not chooser) may create
    a dish."""
    member = make_user(name="member")
    week = make_week()
    _enable_open_choosing(client, login, admin_user)

    assert login(member.name, DEFAULT_PASSWORD).status_code == 200
    assert client.post("/dishes", json=_dish_payload(week)).status_code == 201


def test_closed_mode_still_blocks_non_chooser_BR6(
    db_session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """Regression: with the toggle off, BR-6 still applies — a non-chooser member
    cannot create a dish."""
    outsider = make_user(name="outsider")
    week = make_week()
    assert login(outsider.name, DEFAULT_PASSWORD).status_code == 200
    assert client.post("/dishes", json=_dish_payload(week)).status_code == 403
