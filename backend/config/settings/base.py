"""Shared Django settings for NairaSage."""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env.bool("DEBUG", default=False)
# Fail fast in production: never allow missing SECRET_KEY when DEBUG is off.
if DEBUG:
    SECRET_KEY = env("SECRET_KEY", default="dev-insecure-change-me")
else:
    SECRET_KEY = env("SECRET_KEY")

# Agent and other gated features; override in development if needed.
REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=True)

# LLM keys (django-environ); llm_factory reads these via Django settings.
LLM_PROVIDER = env("LLM_PROVIDER", default="mistral")
LLM_TEMPERATURE = env.float("LLM_TEMPERATURE", default=0.2)
LLM_MAX_TOKENS = env.int("LLM_MAX_TOKENS", default=4096)
LLM_ROUTING_MAX_TOKENS = env.int("LLM_ROUTING_MAX_TOKENS", default=256)
LLM_SYNTHESIS_MAX_TOKENS = env.int("LLM_SYNTHESIS_MAX_TOKENS", default=960)
LLM_SYNTHESIS_TEMPERATURE = env.float("LLM_SYNTHESIS_TEMPERATURE", default=0.2)
MISTRAL_API_KEY = env("MISTRAL_API_KEY", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
GROQ_API_KEY = env("GROQ_API_KEY", default="")
MISTRAL_MODEL = env("MISTRAL_MODEL", default="mistral-large-latest")
OPENAI_MODEL = env("OPENAI_MODEL", default="gpt-4o")
GROQ_MODEL = env("GROQ_MODEL", default="llama-3.3-70b-versatile")
MISTRAL_ROUTING_MODEL = env("MISTRAL_ROUTING_MODEL", default="")
OPENAI_ROUTING_MODEL = env("OPENAI_ROUTING_MODEL", default="")
GROQ_ROUTING_MODEL = env("GROQ_ROUTING_MODEL", default="")

# Tier-1 RAG (Mistral embeddings) + Tavily web search (researcher agent)
MISTRAL_EMBED_MODEL = env("MISTRAL_EMBED_MODEL", default="mistral-embed")
MISTRAL_EMBED_DIMENSIONS = env.int("MISTRAL_EMBED_DIMENSIONS", default=1024)
TAVILY_API_KEY = env("TAVILY_API_KEY", default="")

# AssemblyAI streaming STT: mint short-lived tokens server-side (never expose API key in the browser).
ASSEMBLYAI_API_KEY = env("ASSEMBLYAI_API_KEY", default="")

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="webmaster@localhost")
EMAIL_VERIFICATION_PATH = env("EMAIL_VERIFICATION_PATH", default="/verify-email")

# Paystack plan codes (subscription)
PAYSTACK_SECRET_KEY = env("PAYSTACK_SECRET_KEY", default="")
PAYSTACK_PUBLIC_KEY = env("PAYSTACK_PUBLIC_KEY", default="")
PAYSTACK_PLAN_STARTER = env("PAYSTACK_PLAN_STARTER", default="")
PAYSTACK_PLAN_PRO = env("PAYSTACK_PLAN_PRO", default="")
PAYSTACK_PLAN_ELITE = env("PAYSTACK_PLAN_ELITE", default="")
PAYSTACK_CALLBACK_URL = env(
    "PAYSTACK_CALLBACK_URL",
    default="http://localhost:3000/pricing?paid=1",
)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_rq",
    "axes",
    "core.apps.CoreConfig",
    "apps.users",
    "apps.accounts",
    "apps.transactions",
    "apps.investments",
    "apps.goals",
    "apps.opportunities",
    "apps.tax",
    "apps.debt",
    "apps.notifications",
    "apps.billing",
    "apps.wealth",
]

# Tier-1 RAG requires PostgreSQL + pgvector (see docs/RAG.md). Omit on SQLite default dev/tests.
if env.str("DATABASE_URL", default=""):
    INSTALLED_APPS.append("apps.knowledge")

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
AUTH_USER_MODEL = "users.User"

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

if env.str("DATABASE_URL", default=""):
    DATABASES = {"default": env.db("DATABASE_URL")}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT": 300,
    }
}

RQ_QUEUES = {
    "high": {"USE_REDIS_CACHE": "default"},
    "default": {"USE_REDIS_CACHE": "default"},
    "low": {"USE_REDIS_CACHE": "default"},
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "2000/hour",
        "anon": "100/hour",
        "auth": "60/minute",
        "agent": "120/hour",
        "password_reset": "10/hour",
    },
}

SIMPLE_JWT = {
    # Access token lifetime while user is active (idle sign-out is enforced in the Next dashboard).
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000"],
)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=CORS_ALLOWED_ORIGINS,
)

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = timedelta(hours=1)
