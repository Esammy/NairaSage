from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class HealthEndpointTests(TestCase):
    def test_live_ok(self):
        c = APIClient()
        r = c.get("/api/health/live/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("status"), "ok")

    def test_ready_checks_db_and_cache(self):
        cache.clear()
        c = APIClient()
        r = c.get("/api/health/ready/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("status"), "ready")


class RegistrationTests(TestCase):
    def test_register_creates_user(self):
        c = APIClient()
        r = c.post(
            "/api/auth/register/",
            {
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "test-pass-123",
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertTrue(User.objects.filter(email="newuser@example.com").exists())


class PaystackWebhookTests(TestCase):
    def test_rejects_bad_signature(self):
        c = APIClient()
        r = c.post(
            "/api/billing/webhooks/paystack/",
            b"{}",
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE="invalid",
        )
        self.assertEqual(r.status_code, 400)
