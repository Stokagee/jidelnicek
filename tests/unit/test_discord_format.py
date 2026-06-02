"""Unit test — Discord messages render dates day-first ("D. M."), not ISO.

`format_message` is pure (reads `notification.type` / `.payload`), so we build
lightweight Notification instances without a DB session.
"""

from __future__ import annotations

from shared.channels.discord import format_message
from shared.models import Notification, NotificationType


def _note(ntype: NotificationType, payload: dict) -> Notification:
    return Notification(type=ntype, payload=payload)


def test_signup_message_renders_day_first() -> None:
    msg = format_message(
        _note(NotificationType.SIGNUP_CREATED, {"day": "2026-01-05", "portions": 2})
    )
    assert "for 5. 1. " in msg  # day. month., not "2026-01-05"
    assert "2026-01-05" not in msg


def test_digest_items_render_day_first() -> None:
    msg = format_message(
        _note(
            NotificationType.DIGEST,
            {"items": [{"day": "2026-06-02", "name": "Guláš", "portions": 3}]},
        )
    )
    assert "• 2. 6. — Guláš: 3 portions" in msg


def test_dish_proposed_range_renders_day_first() -> None:
    msg = format_message(
        _note(
            NotificationType.DISH_PROPOSED,
            {"name": "Svíčková", "start_date": "2026-01-05", "end_date": "2026-01-07"},
        )
    )
    assert "(5. 1. - 7. 1.)" in msg


def test_non_iso_day_passes_through() -> None:
    # Missing day falls back to "?" and must not be mangled by the formatter.
    msg = format_message(_note(NotificationType.SIGNUP_CANCELLED, {}))
    assert "for ?" in msg
