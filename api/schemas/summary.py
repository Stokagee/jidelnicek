"""Cook summary schemas (EP-7 / FR-K)."""

from __future__ import annotations

from pydantic import BaseModel


class DishPortions(BaseModel):
    dish_id: int
    name: str
    portions: int
