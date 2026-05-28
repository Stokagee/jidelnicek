"""Object factories for the domain models (DM-*).

Each factory is a fixture returning a callable bound to the per-test
`db_session`, so tests build exactly the graph they need with one line and
everything is rolled back at teardown. Sensible defaults keep call sites short;
every field can be overridden.

`name` columns are English per `docs/glossary.md`. Passwords are hashed with
argon2 (NFR-8); the default-password hash is computed once and reused so
factories stay fast.
"""

from __future__ import annotations

import itertools
import secrets
from collections.abc import Callable
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from argon2 import PasswordHasher
from sqlalchemy.orm import Session

from shared.models import Dish, DishSlot, Signup, User, Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")

#: Plaintext of the default factory password. Tests that exercise login can use
#: this to authenticate a factory-created user.
DEFAULT_PASSWORD = "test-password"

_HASHER = PasswordHasher()
_DEFAULT_PASSWORD_HASH = _HASHER.hash(DEFAULT_PASSWORD)


def _current_monday() -> date:
    today = datetime.now(PRAGUE_TZ).date()
    return today - timedelta(days=today.weekday())


@pytest.fixture
def make_user(db_session: Session) -> Callable[..., User]:
    counter = itertools.count(1)

    def _make(
        *,
        name: str | None = None,
        is_cook: bool = False,
        claimed: bool = True,
        password: str | None = None,
        claim_token: str | None = None,
    ) -> User:
        n = next(counter)
        if claimed:
            display_name = name if name is not None else f"user{n}"
            password_hash = _HASHER.hash(password) if password else _DEFAULT_PASSWORD_HASH
            claim_token_hash = None
            claimed_at = datetime.now(PRAGUE_TZ)
        else:
            # An un-claimed member: name/password not set yet, holds a claim token.
            display_name = name
            password_hash = None
            token = claim_token if claim_token is not None else secrets.token_urlsafe(32)
            claim_token_hash = _HASHER.hash(token)
            claimed_at = None

        user = User(
            name=display_name,
            password_hash=password_hash,
            is_cook=is_cook,
            claim_token_hash=claim_token_hash,
            claimed_at=claimed_at,
        )
        db_session.add(user)
        db_session.flush()
        return user

    return _make


@pytest.fixture
def make_week(db_session: Session) -> Callable[..., Week]:
    # weeks.start_date is unique; auto-offset successive weeks to avoid clashes.
    counter = itertools.count(0)

    def _make(
        *,
        start_date: date | None = None,
        chooser: User | None = None,
    ) -> Week:
        if start_date is None:
            start_date = _current_monday() + timedelta(weeks=next(counter))
        week = Week(start_date=start_date, chooser_id=chooser.id if chooser else None)
        db_session.add(week)
        db_session.flush()
        return week

    return _make


@pytest.fixture
def make_dish(db_session: Session) -> Callable[..., Dish]:
    counter = itertools.count(1)

    def _make(
        *,
        week: Week,
        proposed_by: User,
        name: str | None = None,
        cook: User | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        slot: DishSlot = DishSlot.LUNCH,
    ) -> Dish:
        n = next(counter)
        block_start = start_date if start_date is not None else week.start_date
        # Default block: Mon-Wed (a 3-day batch), the spec's typical case.
        block_end = end_date if end_date is not None else block_start + timedelta(days=2)
        dish = Dish(
            week_id=week.id,
            name=name if name is not None else f"Dish {n}",
            proposed_by_id=proposed_by.id,
            # V1: cook is always the admin/proposer; no logic depends on it (§11).
            cook_id=(cook or proposed_by).id,
            slot=slot,
            start_date=block_start,
            end_date=block_end,
        )
        db_session.add(dish)
        db_session.flush()
        return dish

    return _make


@pytest.fixture
def make_signup(db_session: Session) -> Callable[..., Signup]:
    def _make(
        *,
        dish: Dish,
        user: User,
        day: date | None = None,
        portions: int = 1,
    ) -> Signup:
        signup = Signup(
            dish_id=dish.id,
            user_id=user.id,
            day=day if day is not None else dish.start_date,
            portions=portions,
        )
        db_session.add(signup)
        db_session.flush()
        return signup

    return _make


@pytest.fixture
def admin_user(make_user: Callable[..., User]) -> User:
    """The single cook/admin (is_cook=true), claimed and ready to log in."""
    return make_user(name="admin", is_cook=True)


@pytest.fixture
def test_user(make_user: Callable[..., User]) -> User:
    """A claimed regular member."""
    return make_user(name="member")


@pytest.fixture
def current_week(make_week: Callable[..., Week]) -> Week:
    """This (Europe/Prague) week's container, no chooser set."""
    return make_week()
