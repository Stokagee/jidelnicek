"""Access to the installation-wide settings singleton (issue #77).

One row, `id == 1` (seeded by migration 0004). `get_app_settings` is defensive:
it lazily creates the row if it is somehow missing so callers always get an
object to read.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from shared.models import AppSettings

SETTINGS_ID = 1


def get_app_settings(session: Session) -> AppSettings:
    settings = session.get(AppSettings, SETTINGS_ID)
    if settings is None:
        settings = AppSettings(id=SETTINGS_ID, open_choosing=False)
        session.add(settings)
        session.flush()
    return settings
