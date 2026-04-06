from django.urls import path

from apps.investments import views

urlpatterns = [
    path("quote/", views.MarketQuoteView.as_view()),
]
