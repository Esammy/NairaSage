from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.urls import path


def liveness(_request):
    return JsonResponse({"status": "ok"})


def readiness(_request):
    errors = []
    try:
        connection.ensure_connection()
    except Exception as exc:  # noqa: BLE001
        errors.append(f"db:{exc!s}")
    try:
        cache.set("health_check", "1", 10)
        if cache.get("health_check") != "1":
            errors.append("cache:unexpected")
    except Exception as exc:  # noqa: BLE001
        errors.append(f"cache:{exc!s}")
    if errors:
        return JsonResponse({"status": "unhealthy", "errors": errors}, status=503)
    return JsonResponse({"status": "ready"})


urlpatterns = [
    path("live/", liveness),
    path("ready/", readiness),
]
