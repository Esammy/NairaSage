"""Production settings."""

import logging

from .base import *  # noqa: F403

DEBUG = False

REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=True)  # noqa: F405

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

if env("SENTRY_DSN", default=None):  # noqa: F405
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=env("SENTRY_DSN"),  # noqa: F405
        integrations=[
            DjangoIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1),  # noqa: F405
        send_default_pii=False,
    )

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

# Optional S3 / R2 for media (set STORAGES via env-driven override)
if env("AWS_STORAGE_BUCKET_NAME", default=None) and "storages" not in INSTALLED_APPS:  # noqa: F405
    INSTALLED_APPS += ["storages"]  # noqa: F405
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")  # noqa: F405
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")  # noqa: F405
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")  # noqa: F405
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="af-south-1")  # noqa: F405
    STORAGES = {
        **STORAGES,  # noqa: F405
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
    }
