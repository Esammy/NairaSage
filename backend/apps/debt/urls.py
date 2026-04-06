from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.debt import views

router = DefaultRouter()
router.register(r"", views.DebtViewSet, basename="debt")

urlpatterns = [
    path("", include(router.urls)),
]
