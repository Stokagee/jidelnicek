"""String enums mirrored as native Postgres types in migrations."""

from __future__ import annotations

from enum import StrEnum


class DishSlot(StrEnum):
    LUNCH = "lunch"
    DINNER = "dinner"  # forward-compat (§11); no V1 logic depends on it.


class NotificationType(StrEnum):
    SIGNUP_CREATED = "signup_created"
    SIGNUP_INCREASED = "signup_increased"
    SIGNUP_DECREASED = "signup_decreased"
    SIGNUP_CANCELLED = "signup_cancelled"
    DISH_PROPOSED = "dish_proposed"
    DIGEST = "digest"


class NotificationChannel(StrEnum):
    DISCORD = "discord"
    TELEGRAM = "telegram"  # forward-compat impl; not built in V1.


class NotificationStatus(StrEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
