import logging

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import FinancialDNA, SkillOutcome, User, UserGoal

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    subscription_status = serializers.SerializerMethodField()
    subscription_plan_code = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "phone",
            "bvn_verified",
            "tier",
            "onboarded",
            "is_email_verified",
            "subscription_status",
            "subscription_plan_code",
            "created_at",
        )
        read_only_fields = (
            "id",
            "bvn_verified",
            "tier",
            "onboarded",
            "is_email_verified",
            "subscription_status",
            "subscription_plan_code",
            "created_at",
        )

    def get_subscription_status(self, obj):
        sub = getattr(obj, "subscription", None)
        if sub is None:
            return "inactive"
        return sub.status

    def get_subscription_plan_code(self, obj):
        sub = getattr(obj, "subscription", None)
        if sub is None:
            return ""
        return sub.plan_code or ""


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "username", "password", "phone")

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        FinancialDNA.objects.get_or_create(user=user)
        try:
            from apps.users.mail import send_email_verification

            send_email_verification(user)
        except Exception:
            logger.exception("verification_email_failed user_id=%s", user.pk)
        return user


class FinancialDNASerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialDNA
        exclude = ("user",)


class SkillOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillOutcome
        fields = (
            "id",
            "intent_bucket",
            "agents_called",
            "user_query",
            "assistant_response",
            "was_helpful",
            "response_time_ms",
            "created_at",
        )
        read_only_fields = fields


class UserGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGoal
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")
