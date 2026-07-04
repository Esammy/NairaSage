"""Helpers for creating in-app notifications."""

from __future__ import annotations

from typing import Any

from apps.notifications.models import Notification
from apps.users.models import User


def notify(
    user: User,
    title: str,
    body: str,
    *,
    payload: dict[str, Any] | None = None,
    channel: str = "in_app",
) -> Notification:
    return Notification.objects.create(
        user=user,
        title=title,
        body=body,
        channel=channel,
        payload=payload or {},
    )
