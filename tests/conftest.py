"""Root pytest configuration.

Ensures the repo root is importable, best-effort loads `.env` (so the DB URLs
are available under `uv run pytest`), and re-exports every fixture from
`tests/fixtures/*` so tests get them without explicit imports.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make the repo root importable so `tests.fixtures.*` resolves regardless of how
# pytest was invoked (complements `pythonpath = ["."]` in pyproject.toml).
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Load .env (override=False keeps real environment variables authoritative).
try:
    from dotenv import load_dotenv

    load_dotenv(override=False)
except ImportError:
    pass

from tests.fixtures.db import db_session, engine  # noqa: E402,F401
from tests.fixtures.factories import (  # noqa: E402,F401
    admin_user,
    current_week,
    make_dish,
    make_signup,
    make_user,
    make_week,
    test_user,
)
from tests.fixtures.http import app, claim, client, get_me, login  # noqa: E402,F401
from tests.fixtures.time import frozen_clock  # noqa: E402,F401
