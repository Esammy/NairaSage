from django.db import models

from apps.users.models import User


class Notification(models.Model):
    CHANNELS = [
        ("in_app", "In App"),
        ("email", "Email"),
        ("push", "Push"),
    ]
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    channel = models.CharField(max_length=20, choices=CHANNELS, default="in_app")
    is_read = models.BooleanField(default=False)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
