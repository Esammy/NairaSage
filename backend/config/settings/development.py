"""Local development settings."""

import os

# Ensure base.py sees DEBUG=True so SECRET_KEY can use the dev default.
os.environ.setdefault("DEBUG", "true")

from .base import *  # noqa: F403, E402

DEBUG = True

# APIClient / RequestFactory use host "testserver"
ALLOWED_HOSTS = list(ALLOWED_HOSTS) + ["testserver"]  # noqa: F405
