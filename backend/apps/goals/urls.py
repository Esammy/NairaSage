from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.goals import views

router = DefaultRouter()
router.register(r"", views.SavingsGoalViewSet, basename="savingsgoal")

urlpatterns = [
    path("", include(router.urls)),
]
