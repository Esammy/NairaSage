"""Local development settings."""

import os

# Ensure base.py sees DEBUG=True so SECRET_KEY can use the dev default.
os.environ.setdefault("DEBUG", "true")

from .base import *  # noqa: F403, E402

DEBUG = True

# Local dev: allow agent chat without completing email verification. Set
# REQUIRE_EMAIL_VERIFICATION=true in .env to test the production gate.
REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=False)  # noqa: F405

# DRF throttling and other code use the default cache. Redis is optional in local
# dev (many setups do not run redis-server); LocMem avoids 500s on /api/auth/*.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "nairasage-dev",
    }
}

# django_rq cannot use USE_REDIS_CACHE when default cache is not Redis; point
# queues at REDIS_URL so workers still work when Redis is available.
RQ_QUEUES = {
    "high": {"URL": REDIS_URL},  # noqa: F405
    "default": {"URL": REDIS_URL},  # noqa: F405
    "low": {"URL": REDIS_URL},  # noqa: F405
}

# APIClient / RequestFactory use host "testserver"
ALLOWED_HOSTS = list(ALLOWED_HOSTS) + ["testserver"]  # noqa: F405
