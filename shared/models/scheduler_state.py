"""DM-scheduler_state (catch-up for the 6h digest, FR-N4)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class SchedulerState(Base, TimestampMixin):
    __tablename__ = "scheduler_state"

    # e.g. "digest_6h".
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
