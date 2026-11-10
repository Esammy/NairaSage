import logging

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.urls import path

logger = logging.getLogger(__name__)


def liveness(_request):
    return JsonResponse({"status": "ok"})


def readiness(_request):
    errors = []
    try:
        connection.ensure_connection()
    except Exception as exc:  # noqa: BLE001
        logger.error("readiness db check failed: %s", exc)
        errors.append("db")
    try:
        cache.set("health_check", "1", 10)
        if cache.get("health_check") != "1":
            logger.error("readiness cache check returned unexpected value")
            errors.append("cache")
    except Exception as exc:  # noqa: BLE001
        logger.error("readiness cache check failed: %s", exc)
        errors.append("cache")
    if errors:
        return JsonResponse({"status": "unhealthy", "errors": errors}, status=503)
    return JsonResponse({"status": "ready"})


urlpatterns = [
    path("live/", liveness),
    path("ready/", readiness),
]
