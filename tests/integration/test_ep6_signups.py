"""EP-6 · Signups (FR-S) — tests-first (T-6.1).

Two groups:

* `TestSignupDbConstraints` — the data-integrity invariants already shipped in
  EP-1 (BR-3 partial unique, BR-4 portions >= 1, BR-7 soft-delete). These are
  **real, passing now** and guard the migration.
* `TestSignupApi` — the application behaviour through HTTP. Written before the
  endpoints (T-6.2) and before EP-3 auth, so `xfail(strict=True)` until they land.

Assumed endpoint contract for T-6.2 (spec §9):
- POST   /signups {dish_id, day, portions} -> 201; day outside block -> 422 (BR-2);
         portions < 1 -> 422 (BR-4); re-signup for same (dish, day) updates the
         existing active row instead of duplicating (BR-3 / AC-3).
- PATCH  /signups/{id} {portions} -> 200 (owner) — change incl. lower (FR-S4).
- DELETE /signups/{id}            -> 200 soft-delete = unregister (FR-S5 / BR-7).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from shared.models import Dish, Signup, User, Week
from tests.fixtures.factories import DEFAULT_PASSWORD

PRAGUE_TZ = ZoneInfo("Europe/Prague")


class TestSignupDbConstraints:
    """EP-1 invariants — real green tests (no xfail)."""

    def test_db_rejects_portions_below_one_BR4(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
    ) -> None:
        """BR-4: the DB check constraint rejects portions < 1."""
        user = make_user(name="eater")
        week = make_week()
        dish = make_dish(week=week, proposed_by=user)

        with pytest.raises(IntegrityError), db_session.begin_nested():
            db_session.add(
                Signup(dish_id=dish.id, user_id=user.id, day=dish.start_date, portions=0)
            )
            db_session.flush()

    def test_db_unique_active_signup_per_dish_user_day_BR3(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        make_signup: Callable[..., Signup],
    ) -> None:
        """BR-3: at most one active signup per (dish, user, day)."""
        user = make_user(name="eater")
        week = make_week()
        dish = make_dish(week=week, proposed_by=user)
        make_signup(dish=dish, user=user, day=dish.start_date, portions=1)

        with pytest.raises(IntegrityError), db_session.begin_nested():
            db_session.add(
                Signup(dish_id=dish.id, user_id=user.id, day=dish.start_date, portions=2)
            )
            db_session.flush()

    def test_db_allows_resignup_after_soft_delete_BR3_BR7(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        make_signup: Callable[..., Signup],
    ) -> None:
        """BR-3/BR-7: the partial unique index excludes soft-deleted rows, so a
        user can sign up again for a day they previously cancelled."""
        user = make_user(name="eater")
        week = make_week()
        dish = make_dish(week=week, proposed_by=user)

        first = make_signup(dish=dish, user=user, day=dish.start_date, portions=1)
        first.deleted_at = datetime.now(PRAGUE_TZ)
        db_session.flush()

        # A new active signup for the same (dish, user, day) is allowed.
        again = make_signup(dish=dish, user=user, day=dish.start_date, portions=2)
        db_session.flush()
        assert again.id is not None
        assert again.id != first.id


class TestSignupApi:
    """Application behaviour through HTTP."""

    @staticmethod
    def _payload(dish: Dish, day=None, portions: int = 1) -> dict:
        return {
            "dish_id": dish.id,
            "day": (day or dish.start_date).isoformat(),
            "portions": portions,
        }

    def test_signup_day_outside_block_is_rejected_AC1(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        client,
        login: Callable[[str, str], object],
    ) -> None:
        """AC-1 (FR-S1, BR-2): a day outside the dish block (Mon-Wed -> Thu) is
        rejected."""
        member = make_user(name="member")
        week = make_week()
        dish = make_dish(week=week, proposed_by=member)  # block = Mon..Wed
        thursday = dish.start_date + timedelta(days=3)

        assert login(member.name, DEFAULT_PASSWORD).status_code == 200
        response = client.post("/signups", json=self._payload(dish, day=thursday))
        assert response.status_code == 422

    def test_signup_portions_below_one_is_rejected_AC2(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        client,
        login: Callable[[str, str], object],
    ) -> None:
        """AC-2 (FR-S1, BR-4): portions of 0 are rejected."""
        member = make_user(name="member")
        week = make_week()
        dish = make_dish(week=week, proposed_by=member)

        assert login(member.name, DEFAULT_PASSWORD).status_code == 200
        response = client.post("/signups", json=self._payload(dish, portions=0))
        assert response.status_code == 422

    def test_resignup_same_day_updates_existing_AC3(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        client,
        login: Callable[[str, str], object],
    ) -> None:
        """AC-3 (BR-3): re-signing up for the same day updates the existing active
        row rather than creating a duplicate."""
        member = make_user(name="member")
        week = make_week()
        dish = make_dish(week=week, proposed_by=member)
        day = dish.start_date

        assert login(member.name, DEFAULT_PASSWORD).status_code == 200
        assert client.post("/signups", json=self._payload(dish, day=day, portions=1)).status_code in (
            200,
            201,
        )
        assert client.post("/signups", json=self._payload(dish, day=day, portions=3)).status_code in (
            200,
            201,
        )

        active = db_session.scalars(
            select(Signup).where(
                Signup.dish_id == dish.id,
                Signup.user_id == member.id,
                Signup.day == day,
                Signup.deleted_at.is_(None),
            )
        ).all()
        assert len(active) == 1
        assert active[0].portions == 3

    def test_member_signs_up_to_chooser_proposed_dish_AC6(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        client,
        login: Callable[[str, str], object],
    ) -> None:
        """AC-6 (FR-S3): a member can sign up to a dish proposed by the chooser."""
        chooser = make_user(name="chooser")
        member = make_user(name="member")
        week = make_week(chooser=chooser)
        dish = make_dish(week=week, proposed_by=chooser)

        assert login(member.name, DEFAULT_PASSWORD).status_code == 200
        response = client.post("/signups", json=self._payload(dish, portions=2))
        assert response.status_code in (200, 201)

    def test_owner_can_reduce_then_cancel_signup_FRS4_FRS5(
        self,
        db_session: Session,
        make_user: Callable[..., User],
        make_week: Callable[..., Week],
        make_dish: Callable[..., Dish],
        client,
        login: Callable[[str, str], object],
    ) -> None:
        """FR-S4: the owner can lower portions; FR-S5: cancellation is a
        soft-delete (kept for history / notifications)."""
        member = make_user(name="member")
        week = make_week()
        dish = make_dish(week=week, proposed_by=member)

        assert login(member.name, DEFAULT_PASSWORD).status_code == 200
        created = client.post("/signups", json=self._payload(dish, portions=3))
        assert created.status_code in (200, 201)
        signup_id = created.json()["id"]

        assert client.patch(f"/signups/{signup_id}", json={"portions": 1}).status_code == 200
        assert client.delete(f"/signups/{signup_id}").status_code == 200

        signup = db_session.get(Signup, signup_id)
        assert signup.deleted_at is not None
