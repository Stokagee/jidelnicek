"""DM-signups."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Signup(Base, TimestampMixin):
    __tablename__ = "signups"
    __table_args__ = (
        # BR-4: portions per day must be at least 1.
        CheckConstraint("portions >= 1", name="ck_signups_portions_min_1"),
        # BR-3: at most one ACTIVE signup per (dish, user, day).
        # Soft-deleted rows are intentionally excluded.
        Index(
            "ux_signups_dish_user_day_active",
            "dish_id",
            "user_id",
            "day",
            unique=True,
            postgresql_where="deleted_at IS NULL",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    dish_id: Mapped[int] = mapped_column(
        ForeignKey("dishes.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # BR-2 ("day must lie within the dish block") is enforced in the application
    # layer (BR-8), not by a DB trigger.
    day: Mapped[date] = mapped_column(Date, nullable=False)
    portions: Mapped[int] = mapped_column(Integer, nullable=False)
    # BR-7 soft-delete = the user "unregistered".
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
