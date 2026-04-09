from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users import views

router = DefaultRouter()
router.register(r"goals", views.UserGoalViewSet, basename="usergoal")

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("me/", views.MeView.as_view(), name="me"),
    path("token/", views.ThrottledTokenView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "password-reset/",
        views.PasswordResetRequestView.as_view(),
        name="password_reset_request",
    ),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(
        "verify-email/",
        views.EmailVerifyConfirmView.as_view(),
        name="verify_email",
    ),
    path(
        "verify-email/resend/",
        views.ResendVerificationView.as_view(),
        name="verify_email_resend",
    ),
    path("", include(router.urls)),
]
