"""Installation-wide settings endpoints (issue #77).

`open_choosing` is the button that opens dish creation to everyone and unlocks
the 30-day horizon (#80). Any logged-in user may read it (the frontend needs it
to decide what to show); only the admin may flip it.
"""

from __future__ import annotations

from fastapi import APIRouter

from api.app_settings import get_app_settings
from api.deps import AdminUser, CurrentUser, SessionDep
from api.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
def read_settings(_user: CurrentUser, session: SessionDep) -> SettingsResponse:
    settings = get_app_settings(session)
    return SettingsResponse(open_choosing=settings.open_choosing)


@router.put("/settings", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdate, _admin: AdminUser, session: SessionDep
) -> SettingsResponse:
    settings = get_app_settings(session)
    settings.open_choosing = body.open_choosing
    session.commit()
    return SettingsResponse(open_choosing=settings.open_choosing)
