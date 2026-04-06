#!/usr/bin/env python
"""
Smoke-test core API + coordinator without starting runserver.
Run from backend/: python scripts/smoke_api_test.py
Requires: migrate applied; Redis optional (readiness may be 503 without it).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

EMAIL = "smoke_api_test@nairasage.local"
PASSWORD = "SmokeTest_Secure99!"
USERNAME = "smoke_api_user"


def main() -> int:
    client = APIClient()
    errors: list[str] = []

    r = client.get("/api/health/live/")
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"health live: {r.status_code}")
    print("GET /api/health/live/", r.status_code)

    r = client.get("/api/health/ready/")
    if r.status_code not in (status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE):
        errors.append(f"health ready unexpected: {r.status_code}")
    print("GET /api/health/ready/", r.status_code, "(503 OK if Redis/cache down)")

    User.objects.filter(email=EMAIL).delete()
    r = client.post(
        "/api/auth/register/",
        {
            "email": EMAIL,
            "username": USERNAME,
            "password": PASSWORD,
            "phone": "",
        },
        format="json",
    )
    if r.status_code not in (status.HTTP_200_OK, status.HTTP_201_CREATED):
        errors.append(f"register: {r.status_code} {getattr(r, 'data', r.content)}")
    print("POST /api/auth/register/", r.status_code)

    r = client.post(
        "/api/auth/token/",
        {"email": EMAIL, "password": PASSWORD},
        format="json",
    )
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"token: {r.status_code} {getattr(r, 'data', r.content)}")
        print("FAIL login — stopping before authenticated checks")
        return 1
    access = r.data["access"]
    print("POST /api/auth/token/", r.status_code)

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    r = client.get("/api/auth/me/")
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"me: {r.status_code}")
    print("GET /api/auth/me/", r.status_code)

    r = client.get("/api/dna/")
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"dna: {r.status_code}")
    print("GET /api/dna/", r.status_code)

    r = client.get("/api/portfolio/")
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"portfolio: {r.status_code}")
    print("GET /api/portfolio/", r.status_code)

    r = client.post(
        "/api/agent/educator/",
        {"message": "Define inflation in one sentence."},
        format="json",
    )
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"agent educator: {r.status_code} {getattr(r, 'data', r.content)[:200]}")
    else:
        summary = (r.data or {}).get("summary", "")
        ok = "financial" in str(summary).lower() or len(str(summary)) > 20
        if not ok:
            errors.append("agent educator: unexpected short response")
    print("POST /api/agent/educator/", r.status_code)

    r = client.post(
        "/api/agent/chat/",
        {"message": "What is a T-bill? One sentence."},
        format="json",
    )
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"coordinator chat: {r.status_code} {getattr(r, 'data', r.content)[:200]}")
    else:
        body = r.data or {}
        if not body.get("response"):
            errors.append("coordinator: missing response key")
        print(
            "POST /api/agent/chat/",
            r.status_code,
            "agents_used=",
            body.get("agents_used"),
            "outcome_id=",
            body.get("outcome_id"),
        )

    r = client.post(
        "/api/agent/chat/stream/",
        {"message": "One sentence on saving in Naira."},
        format="json",
    )
    if r.status_code != status.HTTP_200_OK:
        errors.append(f"coordinator stream: {r.status_code}")
    else:
        raw = b"".join(r.streaming_content)
        if b"event: meta" not in raw or b"event: done" not in raw:
            errors.append("coordinator stream: missing SSE events")
        if b"event: delta" not in raw:
            errors.append("coordinator stream: no delta chunks")
        print("POST /api/agent/chat/stream/", r.status_code, "bytes=", len(raw))

    if errors:
        print("\nFAILURES:")
        for e in errors:
            print(" -", e)
        return 1

    print("\nAll smoke checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
