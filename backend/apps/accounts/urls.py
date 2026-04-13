from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts import views

router = DefaultRouter()
router.register(r"", views.BankAccountViewSet, basename="bankaccount")

urlpatterns = [
    path("dashboard/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("", include(router.urls)),
]
