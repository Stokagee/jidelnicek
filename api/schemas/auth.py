"""Auth request/response schemas (EP-3 / FR-A)."""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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


class UserResponse(BaseModel):
    """Member roster entry for GET /users (unblocks T-4.3 chooser picker, T-7.3 name display)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    # ORM column is `is_cook`; JSON key exposed to clients is `is_admin`.
    is_admin: bool = Field(validation_alias=AliasChoices('is_admin', 'is_cook'))
