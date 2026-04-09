from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.billing import views

router = DefaultRouter()
router.register(r"events", views.BillingEventViewSet, basename="billingevent")

urlpatterns = [
    path("subscription/", views.SubscriptionView.as_view()),
    path("subscribe/", views.PaystackSubscribeView.as_view()),
    path("paystack/config/", views.PaystackPublicConfigView.as_view()),
    path("webhooks/paystack/", views.PaystackWebhookView.as_view()),
    path("", include(router.urls)),
]
