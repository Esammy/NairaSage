"""Custom DRF permissions."""

from rest_framework.permissions import BasePermission


class IsEmailVerified(BasePermission):
    message = "Please verify your email to use this feature."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_email_verified", False))


class IsProOrElite(BasePermission):
    """Allow only Pro or Elite tier users."""

    message = "This feature requires a Pro or Elite subscription."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "tier", "free") in ("pro", "elite")
