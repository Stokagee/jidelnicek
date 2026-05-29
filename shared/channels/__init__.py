"""Notification channels (FR-N5).

`NotificationChannel` is the delivery interface shared by api and worker. V1 ships
`DiscordChannel` (single webhook); Telegram is a future second implementation and
is intentionally absent (§11). `build_default_channel()` picks the channel from
config — Discord when a webhook is set, otherwise a stdout `LoggingChannel` so a
fresh install still runs.
"""

from __future__ import annotations

from shared.channels.base import NotificationChannel
from shared.channels.discord import DiscordChannel
from shared.channels.logging import LoggingChannel
from shared.config import get_settings

__all__ = [
    "DiscordChannel",
    "LoggingChannel",
    "NotificationChannel",
    "build_default_channel",
]


def build_default_channel() -> NotificationChannel:
    webhook = get_settings().discord_webhook_url
    if webhook:
        return DiscordChannel(webhook)
    return LoggingChannel()
