"""Signup request/response schemas (EP-6 / FR-S)."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class SignupWithUserName(BaseModel):
    """FR-K3: per-dish signup entry for the This-week screen (non-admin members)."""

    id: int
    user_id: int
    user_name: str | None
    day: date
    portions: int


class SignupCreate(BaseModel):
    dish_id: int
    day: date
    # BR-4: portions >= 1 (Pydantic rejects <1 with 422).
    portions: int = Field(ge=1)


class SignupUpdate(BaseModel):
    # BR-4: portions >= 1.
    portions: int = Field(ge=1)


class SignupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dish_id: int
    user_id: int
    day: date
    portions: int
