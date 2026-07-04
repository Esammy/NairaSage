from django.urls import path

from apps.search import views

urlpatterns = [
    path("", views.UnifiedSearchView.as_view(), name="unified-search"),
]
