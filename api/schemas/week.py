"""Week request/response schemas (EP-4 / FR-W)."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict

from api.schemas.dish import DishResponse


class SetChooserRequest(BaseModel):
    # BR-1 mechanism: who chooses dishes this week. No policy here.
    chooser_id: int


class WeekResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    start_date: date
    chooser_id: int | None
    dishes: list[DishResponse] = []
