"""EP-5 · Dishes (FR-D) — tests-first (T-5.1).

Written before the endpoints (T-5.2); needs EP-3 auth to log in, so xfail until
both land. Behaviour is exercised through HTTP; existing dishes for the
edit/delete permission cases are set up directly via the factory.

Per §11, `cook_id` and `slot` are present with defaults and carry no V1 logic —
FR-D3/FR-D4 only assert the dish *carries* them (cook = the admin, slot = lunch).

Assumed endpoint contract for T-5.2 (spec §9):
- POST   /dishes {week_id, name, start_date, end_date} -> 201 (admin/chooser; BR-6)
- PATCH  /dishes/{id} {name?, ...}  -> 200 (proposer or admin; BR-5) else 403
- DELETE /dishes/{id}              -> 200 soft-delete (BR-7); proposer/admin only
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta

from sqlalchemy.orm import Session

from shared.models import Dish, DishSlot, User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD


def _dish_payload(week: Week, name: str = "Svíčková") -> dict:
    return {
        "week_id": week.id,
        "name": name,
        "start_date": week.start_date.isoformat(),
        "end_date": (week.start_date + timedelta(days=2)).isoformat(),
    }


def test_admin_creates_dish_with_v1_defaults_FRD1_FRD3_FRD4(
    db_session: Session,
    admin_user: User,
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-D1: admin creates a dish (name + day block). FR-D3/FR-D4: it carries the
    proposer, the cook (V1 = admin) and the slot (V1 = lunch)."""
    week = make_week()
    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200

    response = client.post("/dishes", json=_dish_payload(week))
    assert response.status_code in (200, 201)

    dish = db_session.get(Dish, response.json()["id"])
    assert dish.proposed_by_id == admin_user.id
    assert dish.cook_id == admin_user.id
    assert dish.slot == DishSlot.LUNCH


def test_chooser_creates_dish_in_their_week_FRD2(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-D2: the week's chooser creates a dish the same way; it records them as
    the proposer while the cook stays the admin (FR-D3)."""
    chooser = make_user(name="chooser")
    week = make_week(chooser=chooser)
    assert login(chooser.name, DEFAULT_PASSWORD).status_code == 200

    response = client.post("/dishes", json=_dish_payload(week, "Guláš"))
    assert response.status_code in (200, 201)

    dish = db_session.get(Dish, response.json()["id"])
    assert dish.proposed_by_id == chooser.id
    assert dish.cook_id == admin_user.id


def test_proposer_can_edit_own_dish_FRD5_BR5(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    client,
    login: Callable[[str, str], object],
) -> None:
    """FR-D5 / BR-5: the proposer may edit their own dish."""
    chooser = make_user(name="chooser")
    week = make_week(chooser=chooser)
    dish = make_dish(week=week, proposed_by=chooser)

    assert login(chooser.name, DEFAULT_PASSWORD).status_code == 200
    response = client.patch(f"/dishes/{dish.id}", json={"name": "Rajská"})
    assert response.status_code == 200


def test_admin_can_edit_any_dish_BR5(
    db_session: Session,
    admin_user: User,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    client,
    login: Callable[[str, str], object],
) -> None:
    """BR-5: the admin may edit a dish proposed by someone else."""
    chooser = make_user(name="chooser")
    week = make_week(chooser=chooser)
    dish = make_dish(week=week, proposed_by=chooser)

    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    response = client.patch(f"/dishes/{dish.id}", json={"name": "Čočka"})
    assert response.status_code == 200


def test_non_creator_non_admin_member_cannot_delete_dish_AC12(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    client,
    login: Callable[[str, str], object],
) -> None:
    """AC-12 (FR-D5, BR-5): a chooser-proposed dish cannot be deleted by another
    member who is neither its proposer nor the admin."""
    chooser = make_user(name="chooser")
    outsider = make_user(name="outsider")
    week = make_week(chooser=chooser)
    dish = make_dish(week=week, proposed_by=chooser)

    assert login(outsider.name, DEFAULT_PASSWORD).status_code == 200
    response = client.delete(f"/dishes/{dish.id}")
    assert response.status_code == 403


def test_non_creator_non_admin_member_cannot_edit_dish_BR5(
    db_session: Session,
    make_user: Callable[..., User],
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    client,
    login: Callable[[str, str], object],
) -> None:
    """BR-5: a member who is neither proposer nor admin cannot edit a dish."""
    chooser = make_user(name="chooser")
    outsider = make_user(name="outsider")
    week = make_week(chooser=chooser)
    dish = make_dish(week=week, proposed_by=chooser)

    assert login(outsider.name, DEFAULT_PASSWORD).status_code == 200
    response = client.patch(f"/dishes/{dish.id}", json={"name": "nope"})
    assert response.status_code == 403


def test_delete_dish_is_soft_delete_BR7(
    db_session: Session,
    admin_user: User,
    make_week: Callable[..., Week],
    make_dish: Callable[..., Dish],
    client,
    login: Callable[[str, str], object],
) -> None:
    """BR-7: deleting a dish is a soft-delete — the row survives with deleted_at
    set (kept for history / future cost split)."""
    week = make_week()
    dish = make_dish(week=week, proposed_by=admin_user)

    assert login(admin_user.name, DEFAULT_PASSWORD).status_code == 200
    assert client.delete(f"/dishes/{dish.id}").status_code == 200

    db_session.refresh(dish)
    assert dish.deleted_at is not None
