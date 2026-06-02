"""DM extension: installation-wide settings (issue #77).

A single-row table (`id == 1`) holding installation-wide toggles. The first is
`open_choosing`: when on, anyone may create dishes (relaxing BR-6) and the 30-day
planning horizon is in effect (#80). It is a mechanism column; flipping it is the
admin's policy decision (BR-1 spirit). Additive with a server default so existing
installs read `false`.
"""

from __future__ import annotations

from sqlalchemy import Boolean, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class AppSettings(Base, TimestampMixin):
    __tablename__ = "app_settings"
    __table_args__ = (CheckConstraint("id = 1", name="app_settings_singleton"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    open_choosing: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
