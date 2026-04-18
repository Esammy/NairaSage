"""ASGI config for NairaSage.

Run with uvicorn for better concurrent long-lived SSE streams, e.g.:
  uvicorn config.asgi:application --host 0.0.0.0 --port 8000
Set DJANGO_SETTINGS_MODULE for local dev (e.g. config.settings.development).
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_asgi_application()
