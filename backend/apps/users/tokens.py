"""Token generators for email verification (separate from password-reset tokens)."""

from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return (
            str(user.is_active)
            + str(user.pk)
            + str(timestamp)
            + str(user.email)
            + str(getattr(user, "is_email_verified", False))
        )


email_verification_token_generator = EmailVerificationTokenGenerator()
