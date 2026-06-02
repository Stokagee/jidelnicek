"""Add app_settings singleton (open_choosing toggle).

Issue #77/#80: an installation-wide toggle that opens dish creation to everyone
and unlocks the 30-day planning horizon. Additive — a single seed row (id=1) with
open_choosing=false preserves the current behaviour until the admin flips it.

Revision ID: 0004_app_settings
Revises: 0003_chooser_days
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_app_settings"
down_revision = "0003_chooser_days"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("open_choosing", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("id = 1", name="app_settings_singleton"),
    )
    # Seed the singleton row so the app always has settings to read.
    op.execute("INSERT INTO app_settings (id, open_choosing) VALUES (1, false)")


def downgrade() -> None:
    op.drop_table("app_settings")
