"""Session cookie signing.

A session is just the authenticated ``user_id`` carried in an httpOnly cookie,
signed with an HMAC over the project ``session_secret`` (no server-side store —
sufficient for a 4-user home app, NFR-4). Tamper or wrong-key → ``read_session``
returns ``None`` and the request is treated as unauthenticated.
"""

from __future__ import annotations

import base64
import hmac
from hashlib import sha256

from shared.config import get_settings


def _sign(value: str) -> str:
    secret = get_settings().session_secret.encode()
    digest = hmac.new(secret, value.encode(), sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def make_session(user_id: int) -> str:
    """Build the signed cookie value for a logged-in user."""
    payload = str(user_id)
    return f"{payload}.{_sign(payload)}"


def read_session(cookie: str | None) -> int | None:
    """Return the user id from a valid cookie, else ``None``."""
    if not cookie or "." not in cookie:
        return None
    payload, _, signature = cookie.rpartition(".")
    # Constant-time comparison to avoid leaking the signature via timing.
    if not hmac.compare_digest(signature, _sign(payload)):
        return None
    try:
        return int(payload)
    except ValueError:
        return None
