import logging

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.mail import send_email_verification, send_password_reset_email
from apps.users.models import FinancialDNA, User, UserGoal
from apps.users.serializers import (
    FinancialDNASerializer,
    RegisterSerializer,
    UserGoalSerializer,
    UserSerializer,
)
from apps.users.tokens import email_verification_token_generator

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return User.objects.select_related("subscription").get(pk=self.request.user.pk)


class ThrottledTokenView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "auth"


class PasswordResetRequestView(APIView):
    """POST { email } — always same response to reduce email enumeration."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        if email:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                try:
                    send_password_reset_email(user)
                except Exception:
                    logger.exception("password_reset_email_failed user_id=%s", user.pk)
        return Response(
            {
                "detail": "If an account exists for that email, "
                "we sent password reset instructions."
            }
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")
        if not uid or not token or not password:
            return Response(
                {"detail": "uid, token, and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response(
                {"detail": list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset. You can sign in."})


class EmailVerifyConfirmView(APIView):
    """GET ?uid=&token= — mark email verified."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        uid = request.query_params.get("uid")
        token = request.query_params.get("token")
        if not uid or not token:
            return Response(
                {"detail": "uid and token query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {"detail": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_email_verified:
            return Response({"detail": "Email is already verified."})
        if not email_verification_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired verification link."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])
        return Response({"detail": "Email verified successfully."})


class ResendVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({"detail": "Email is already verified."})
        try:
            send_email_verification(user)
        except Exception:
            logger.exception("resend_verification_failed user_id=%s", user.pk)
            return Response(
                {"detail": "Could not send email. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"detail": "Verification email sent."})


class FinancialDNAView(generics.RetrieveUpdateAPIView):
    serializer_class = FinancialDNASerializer

    def get_object(self):
        dna, _ = FinancialDNA.objects.get_or_create(user=self.request.user)
        return dna

    def perform_update(self, serializer):
        serializer.save()
        user = self.request.user
        if not user.onboarded:
            user.onboarded = True
            user.save(update_fields=["onboarded", "updated_at"])


class UserGoalViewSet(viewsets.ModelViewSet):
    serializer_class = UserGoalSerializer

    def get_queryset(self):
        return UserGoal.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
