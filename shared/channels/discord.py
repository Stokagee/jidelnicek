"""Discord webhook channel (FR-N5, FR-N7).

Posts a short human message to a single configured webhook. The message states
what changed (who/which dish/which day/how many portions) so the cook can act on
it. Raises on a non-2xx response so the worker retries (FR-N6).
"""

from __future__ import annotations

import re

import httpx

from shared.models import Notification, NotificationType

_CHANGE_VERB = {
    NotificationType.SIGNUP_CREATED: "signed up",
    NotificationType.SIGNUP_INCREASED: "increased portions",
    NotificationType.SIGNUP_DECREASED: "decreased portions",
    NotificationType.SIGNUP_CANCELLED: "cancelled",
}

_ISO_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


def _format_day(iso: object) -> str:
    """Render an ISO date (YYYY-MM-DD) as day-first "D. M." — mirrors the web
    `formatDayMonth`. Non-ISO values (e.g. the "?" fallback) pass through unchanged."""
    text = str(iso)
    m = _ISO_DATE.match(text)
    if not m:
        return text
    return f"{int(m.group(3))}. {int(m.group(2))}."


def format_message(notification: Notification) -> str:
    """Compose the human-readable webhook message (FR-N7)."""
    payload = notification.payload or {}
    ntype = notification.type

    if ntype == NotificationType.DISH_PROPOSED:
        return (
            f"🍽️ New dish proposed: **{payload.get('name', '?')}** "
            f"({_format_day(payload.get('start_date', '?'))} - "
            f"{_format_day(payload.get('end_date', '?'))})"
        )
    if ntype == NotificationType.DIGEST:
        items = payload.get("items", [])
        if not items:
            return "📋 6h digest: no active signups."
        lines = [
            f"• {_format_day(it.get('day'))} — {it.get('name')}: {it.get('portions')} portions"
            for it in items
        ]
        return "📋 6h digest:\n" + "\n".join(lines)

    verb = _CHANGE_VERB.get(ntype, "changed")
    day = _format_day(payload.get("day", "?"))
    portions = payload.get("portions")
    suffix = f" → {portions} portions" if portions is not None else ""
    return f"🔔 Signup {verb} for {day}{suffix}"


class DiscordChannel:
    name = "discord"

    def __init__(self, webhook_url: str, *, timeout: float = 10.0) -> None:
        self._webhook_url = webhook_url
        self._timeout = timeout

    def send(self, notification: Notification) -> None:
        response = httpx.post(
            self._webhook_url,
            json={"content": format_message(notification)},
            timeout=self._timeout,
        )
        response.raise_for_status()  # non-2xx -> retry (FR-N6)
