"""DM-dishes."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin
from .enums import DishSlot


class Dish(Base, TimestampMixin):
    __tablename__ = "dishes"

    id: Mapped[int] = mapped_column(primary_key=True)
    week_id: Mapped[int] = mapped_column(
        ForeignKey("weeks.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    proposed_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # Forward-compat: V1 always = admin. No V1 logic depends on this.
    cook_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # Forward-compat: V1 always = lunch.
    slot: Mapped[DishSlot] = mapped_column(
        Enum(DishSlot, name="dish_slot", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=DishSlot.LUNCH,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Forward-compat: V1 unused (§11). Stays nullable; no logic.
    price_per_portion: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    # BR-7 soft-delete.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
