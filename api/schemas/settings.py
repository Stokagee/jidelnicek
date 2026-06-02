"""Installation-wide settings schemas (issue #77)."""

from __future__ import annotations

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    open_choosing: bool


class SettingsUpdate(BaseModel):
    open_choosing: bool
