from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/dna/", include("apps.users.dna_urls")),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/transactions/", include("apps.transactions.urls")),
    path("api/portfolio/", include("apps.investments.urls")),
    path("api/market/", include("apps.investments.market_urls")),
    path("api/goals/", include("apps.goals.urls")),
    path("api/opportunities/", include("apps.opportunities.urls")),
    path("api/tax/", include("apps.tax.urls")),
    path("api/debt/", include("apps.debt.urls")),
    path("api/agent/", include("apps.agent_urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/notify/", include("apps.notifications.urls")),
    path("api/health/", include("core.health_urls")),
]

if settings.DEBUG:
    urlpatterns += [
        path("django-rq/", include("django_rq.urls")),
    ]
