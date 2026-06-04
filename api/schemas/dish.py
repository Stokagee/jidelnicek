"""Dish request/response schemas (EP-5 / FR-D; create also used by EP-4)."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from shared.models import DishSlot


class DishCreate(BaseModel):
    # #80: week_id is optional. When omitted, the week is derived from start_date
    # and auto-created (the date-driven planning path); when given, the legacy
    # by-id path is used unchanged.
    week_id: int | None = None
    name: str = Field(min_length=1, max_length=200)
    start_date: date
    end_date: date


class DishUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    start_date: date | None = None
    end_date: date | None = None


class DishResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    week_id: int
    name: str
    proposed_by_id: int
    # cook_id / slot are forward-compat (§11): always admin / lunch in V1.
    cook_id: int
    slot: DishSlot
    start_date: date
    end_date: date
