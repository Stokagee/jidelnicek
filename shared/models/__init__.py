"""SQLAlchemy ORM models for the jidelnicek data layer (DM-*).

Importing this package side-effects `Base.metadata` to include every table,
which is what Alembic's `target_metadata` needs.
"""

from .base import Base, TimestampMixin
from .dish import Dish
from .enums import DishSlot, NotificationChannel, NotificationStatus, NotificationType
from .notification import Notification
from .scheduler_state import SchedulerState
from .signup import Signup
from .user import User
from .week import Week

__all__ = [
    "Base",
    "Dish",
    "DishSlot",
    "Notification",
    "NotificationChannel",
    "NotificationStatus",
    "NotificationType",
    "SchedulerState",
    "Signup",
    "TimestampMixin",
    "User",
    "Week",
]
