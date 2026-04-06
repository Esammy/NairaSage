from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.opportunities import views

router = DefaultRouter()
router.register(r"", views.OpportunityViewSet, basename="opportunity")

urlpatterns = [
    path("", include(router.urls)),
]
