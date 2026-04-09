from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.users.models import User
from apps.users.tokens import email_verification_token_generator


def send_password_reset_email(user: User) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = settings.FRONTEND_URL.rstrip("/")
    link = f"{base}/reset-password?uid={uid}&token={token}"
    send_mail(
        subject="Reset your NairaSage password",
        message=(
            "You requested a password reset.\n\n"
            f"Open this link in your browser (it expires):\n{link}\n\n"
            "If you did not request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_email_verification(user: User) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    base = settings.FRONTEND_URL.rstrip("/")
    path = getattr(settings, "EMAIL_VERIFICATION_PATH", "/verify-email").strip("/")
    link = f"{base}/{path}?uid={uid}&token={token}"
    send_mail(
        subject="Verify your NairaSage email",
        message=(
            "Welcome to NairaSage.\n\n"
            f"Please verify your email by opening:\n{link}\n\n"
            "If you did not create an account, ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
