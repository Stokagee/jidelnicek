"""A no-network channel that logs instead of posting.

Used when no Discord webhook is configured so the worker still runs end-to-end on
a fresh install. Never raises (delivery always "succeeds").
"""

from __future__ import annotations

import logging

from shared.models import Notification

log = logging.getLogger("channels.logging")


class LoggingChannel:
    name = "logging"

    def send(self, notification: Notification) -> None:
        log.info(
            "notification id=%s type=%s payload=%s",
            notification.id,
            notification.type,
            notification.payload,
        )
