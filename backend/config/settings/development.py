"""Local development settings."""

from .base import *  # noqa: F403

DEBUG = True

# APIClient / RequestFactory use host "testserver"
ALLOWED_HOSTS = list(ALLOWED_HOSTS) + ["testserver"]  # noqa: F405
