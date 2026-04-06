from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.tax import views

router = DefaultRouter()
router.register(r"records", views.TaxRecordViewSet, basename="taxrecord")
router.register(r"deadlines", views.TaxDeadlineViewSet, basename="taxdeadline")

urlpatterns = [
    path("", include(router.urls)),
]
