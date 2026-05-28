"""T-1.1 create all tables.

Creates the full DM-* schema in one additive migration:
- DM-users, DM-weeks, DM-dishes, DM-signups, DM-notifications, DM-scheduler_state.
- BR-3 partial unique on signups (dish_id, user_id, day) WHERE deleted_at IS NULL.
- BR-4 check constraint signups.portions >= 1.
- BR-7 soft-delete columns on dishes and signups.
- created_at / updated_at on every table (TIMESTAMPTZ, default now()).
- Postgres-native enums for dish.slot and notification.{type,channel,status}.

Forward-compat fields kept inert in V1: dishes.cook_id (FK -> users), dishes.slot
(default 'lunch'), dishes.price_per_portion (nullable). No V1 logic depends on
them -- see spec section 11 and the data-layer skill.

Revision ID: 0002_t_1_1
Revises: 0001_t_0_3
Create Date: 2026-05-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0002_t_1_1"
down_revision: str | Sequence[str] | None = "0001_t_0_3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Use postgresql.ENUM with create_type=False so SQLAlchemy never tries to issue
# CREATE TYPE for them -- we create the types up-front via raw SQL.
def _dish_slot() -> PgEnum:
    return PgEnum("lunch", "dinner", name="dish_slot", create_type=False)


def _notification_type() -> PgEnum:
    return PgEnum(
        "signup_created",
        "signup_increased",
        "signup_decreased",
        "signup_cancelled",
        "dish_proposed",
        "digest",
        name="notification_type",
        create_type=False,
    )


def _notification_channel() -> PgEnum:
    return PgEnum("discord", "telegram", name="notification_channel", create_type=False)


def _notification_status() -> PgEnum:
    return PgEnum("pending", "sent", "failed", name="notification_status", create_type=False)


def upgrade() -> None:
    op.execute("CREATE TYPE dish_slot AS ENUM ('lunch', 'dinner')")
    op.execute(
        "CREATE TYPE notification_type AS ENUM ("
        "'signup_created', 'signup_increased', 'signup_decreased', "
        "'signup_cancelled', 'dish_proposed', 'digest'"
        ")"
    )
    op.execute("CREATE TYPE notification_channel AS ENUM ('discord', 'telegram')")
    op.execute("CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed')")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(64), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("is_cook", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("claim_token_hash", sa.String(255), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "weeks",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("start_date", sa.Date, nullable=False, unique=True),
        sa.Column(
            "chooser_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "dishes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "week_id",
            sa.Integer,
            sa.ForeignKey("weeks.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "proposed_by_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "cook_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("slot", _dish_slot(), nullable=False, server_default="lunch"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("price_per_portion", sa.Numeric(10, 2), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "signups",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "dish_id",
            sa.Integer,
            sa.ForeignKey("dishes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("day", sa.Date, nullable=False),
        sa.Column("portions", sa.Integer, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("portions >= 1", name="ck_signups_portions_min_1"),
    )
    op.create_index(
        "ux_signups_dish_user_day_active",
        "signups",
        ["dish_id", "user_id", "day"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("type", _notification_type(), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("channel", _notification_channel(), nullable=False),
        sa.Column(
            "status",
            _notification_status(),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_notifications_status_created_at",
        "notifications",
        ["status", "created_at"],
    )

    op.create_table(
        "scheduler_state",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("scheduler_state")
    op.drop_index("ix_notifications_status_created_at", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ux_signups_dish_user_day_active", table_name="signups")
    op.drop_table("signups")
    op.drop_table("dishes")
    op.drop_table("weeks")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS notification_status")
    op.execute("DROP TYPE IF EXISTS notification_channel")
    op.execute("DROP TYPE IF EXISTS notification_type")
    op.execute("DROP TYPE IF EXISTS dish_slot")
