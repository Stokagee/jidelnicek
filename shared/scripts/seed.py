"""Seed CLI: create the admin + 3 unclaimed members + this week's row.

Run from the repo root (after `uv sync` + `alembic upgrade head`):

    uv run seed

Reads DATABASE_URL, ADMIN_NAME, ADMIN_PASSWORD from the env (and optionally
from a local .env file). Idempotent: refuses to run if any user exists.

Outputs the 3 member claim tokens to stdout once. Share them with the
housemates via a private channel -- the hash is what lives in the DB
(NFR-8), the plaintext is shown exactly once.
"""

from __future__ import annotations

import os
import secrets
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from argon2 import PasswordHasher
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from shared.models import User, Week

PRAGUE_TZ = ZoneInfo("Europe/Prague")
NUM_MEMBERS = 3


def _load_dotenv_if_present() -> None:
    """Best-effort load of a .env file from the current directory.

    Doesn't override values already set in the process env. Silent if
    python-dotenv is not installed.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(override=False)


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(
            f"{name} is not set. Copy .env.example to .env and fill it in, "
            f"or export {name} before running this command."
        )
    return value


def _current_week_monday() -> date:
    today = datetime.now(PRAGUE_TZ).date()
    return today - timedelta(days=today.weekday())


def main() -> None:
    _load_dotenv_if_present()

    database_url = _require_env("DATABASE_URL")
    admin_name = _require_env("ADMIN_NAME")
    admin_password = _require_env("ADMIN_PASSWORD")

    hasher = PasswordHasher()

    engine = create_engine(database_url, future=True)
    with Session(engine, future=True) as session, session.begin():
        existing = session.scalar(select(User).limit(1))
        if existing is not None:
            raise SystemExit(
                "Refusing to seed: at least one user already exists. "
                "Truncate `users` or drop the database to re-seed."
            )

        admin = User(
            name=admin_name,
            password_hash=hasher.hash(admin_password),
            is_cook=True,
            claim_token_hash=None,
            claimed_at=datetime.now(tz=PRAGUE_TZ),
        )
        session.add(admin)
        session.flush()
        admin_id = admin.id

        members: list[tuple[int, str]] = []
        for _ in range(NUM_MEMBERS):
            token = secrets.token_urlsafe(32)
            member = User(
                name=None,
                password_hash=None,
                is_cook=False,
                claim_token_hash=hasher.hash(token),
                claimed_at=None,
            )
            session.add(member)
            session.flush()
            members.append((member.id, token))

        monday = _current_week_monday()
        session.add(Week(start_date=monday, chooser_id=None))

    print("Seed complete.")
    print(f"  Admin:        id={admin_id}  name={admin_name!r}  is_cook=true (claimed)")
    print(f"  Current week: start_date={monday.isoformat()}")
    print()
    print("Claim tokens for the 3 members (NFR-8: stored as hash only -- this is")
    print("the only time the plaintext appears). Share each via a private channel:")
    print()
    for user_id, token in members:
        print(f"  user_id={user_id}  token={token}")


def cli() -> None:
    main()
