"""Add chooser_start_date and chooser_end_date to weeks.

Allows the admin to assign specific days (a sub-range of the week) to the
chooser when setting them.  Both columns are nullable so existing rows keep
working without a data migration.

Revision ID: 0003_chooser_days
Revises: 0002_t_1_1
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_chooser_days"
down_revision = "0002_t_1_1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("weeks", sa.Column("chooser_start_date", sa.Date(), nullable=True))
    op.add_column("weeks", sa.Column("chooser_end_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("weeks", "chooser_end_date")
    op.drop_column("weeks", "chooser_start_date")
