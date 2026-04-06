from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.investments import views

router = DefaultRouter()
router.register(r"holdings", views.PortfolioHoldingViewSet, basename="holding")

urlpatterns = [
    path("", views.PortfolioDetailView.as_view()),
] + router.urls
