"""The NotificationChannel interface (FR-N5).

A channel takes a fully-formed outbox `Notification` and delivers it, raising on
failure so the caller (worker delivery) records the error and retries (FR-N6).
Kept deliberately small so a new channel (e.g. Telegram) can be added without
touching the worker core.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from shared.models import Notification


@runtime_checkable
class NotificationChannel(Protocol):
    name: str

    def send(self, notification: Notification) -> None:
        """Deliver the notification. Raise on failure (caller retries)."""
        ...
