"""Seed CLI entry point.

T-0.1 ships a placeholder. T-1.2 fills this in with: admin from .env (single
is_cook = true user) + 3 unclaimed members with claim_token_hash + 1 current
week (this Monday in Europe/Prague). Plaintext claim tokens for the 3 members
are printed to stdout — the admin shares them out-of-band.
"""

from __future__ import annotations


def cli() -> None:
    raise NotImplementedError("seed is implemented in T-1.2")
