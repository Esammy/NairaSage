from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.transactions import views

router = DefaultRouter()
router.register(r"", views.TransactionViewSet, basename="transaction")

urlpatterns = [
    path("", include(router.urls)),
]
