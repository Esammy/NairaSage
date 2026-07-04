from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class UnifiedSearchViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="search@example.com",
            username="searchuser",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_empty_query_returns_empty_results(self):
        res = self.client.get("/api/search/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["results"], [])

    def test_whitespace_query_returns_empty_results(self):
        res = self.client.get("/api/search/", {"q": "   "})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["results"], [])

    def test_requires_authentication(self):
        anon = APIClient()
        res = anon.get("/api/search/", {"q": "x"})
        self.assertEqual(res.status_code, 401)
