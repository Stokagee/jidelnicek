"""Auth request/response schemas (EP-3 / FR-A)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ClaimRequest(BaseModel):
    token: str = Field(min_length=1)
    name: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    name: str = Field(min_length=1)
    password: str = Field(min_length=1)


class MeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    # /me reports whether the user is the admin (= the single is_cook user).
    is_admin: bool


class ClaimTokenResponse(BaseModel):
    token: str
