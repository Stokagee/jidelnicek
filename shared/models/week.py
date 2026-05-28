"""DM-weeks."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Week(Base, TimestampMixin):
    __tablename__ = "weeks"

    id: Mapped[int] = mapped_column(primary_key=True)
    # FR-W1: Monday (ISO) — unique per week.
    start_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    # BR-1 mechanism: who chooses dishes this week. Policy (manual / auto
    # rotation / game outcome) lives in the app layer.
    chooser_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
