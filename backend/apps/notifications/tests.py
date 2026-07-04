from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.notifications.services import notify

User = get_user_model()


class NotificationViewSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="notify@example.com",
            username="notifyuser",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_unread_count_and_mark_all_read(self):
        notify(self.user, "A", "First")
        notify(self.user, "B", "Second")
        Notification.objects.filter(user=self.user).update(is_read=True)
        notify(self.user, "C", "Third")

        res = self.client.get("/api/notify/unread-count/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["count"], 1)

        res = self.client.post("/api/notify/mark-all-read/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["updated"], 1)

        res = self.client.get("/api/notify/unread-count/")
        self.assertEqual(res.json()["count"], 0)
