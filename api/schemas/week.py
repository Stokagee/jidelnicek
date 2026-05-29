"""Week request/response schemas (EP-4 / FR-W)."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from api.schemas.dish import DishResponse
from api.schemas.signup import SignupWithUserName


class SetChooserRequest(BaseModel):
    # BR-1 mechanism: who chooses dishes this week. No policy here.
    chooser_id: int


class DishWithSignupsResponse(DishResponse):
    """DishResponse extended with active signups for the This-week screen (FR-K3)."""

    signups: list[SignupWithUserName] = Field(default_factory=list)


class WeekResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    start_date: date
    chooser_id: int | None
    dishes: list[DishWithSignupsResponse] = []
