"""Password and claim-token hashing (NFR-8).

argon2 is the project's chosen primitive (CLAUDE.md §3). Passwords and claim
tokens are both stored only as argon2 hashes — never as plaintext. ``verify_*``
return a bool instead of raising so call sites stay branch-friendly.
"""

from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error

_HASHER = PasswordHasher()


def hash_password(password: str) -> str:
    # NFR-8: passwords stored as argon2 hash only.
    return _HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _HASHER.verify(password_hash, password)
    except Argon2Error:
        return False


def hash_token(token: str) -> str:
    # NFR-8: claim token stored as hash only.
    return _HASHER.hash(token)


def verify_token(token_hash: str, token: str) -> bool:
    try:
        return _HASHER.verify(token_hash, token)
    except Argon2Error:
        return False
