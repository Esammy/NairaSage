from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts import views

router = DefaultRouter()
router.register(r"", views.BankAccountViewSet, basename="bankaccount")

urlpatterns = [
    path("", include(router.urls)),
]
