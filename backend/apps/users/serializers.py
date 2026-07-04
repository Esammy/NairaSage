import logging

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import (
    CoordinatorChatSession,
    FinancialDNA,
    SkillOutcome,
    User,
    UserGoal,
)

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    subscription_status = serializers.SerializerMethodField()
    subscription_plan_code = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    notification_prefs = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "phone",
            "bvn_verified",
            "tier",
            "onboarded",
            "is_email_verified",
            "subscription_status",
            "subscription_plan_code",
            "display_name",
            "avatar_url",
            "notification_prefs",
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
            "display_name",
            "avatar_url",
            "created_at",
        )

    def get_display_name(self, obj):
        fn = (obj.first_name or "").strip()
        ln = (obj.last_name or "").strip()
        if fn or ln:
            return f"{fn} {ln}".strip()
        if obj.username:
            return obj.username
        return (obj.email or "").split("@")[0] or "User"

    def get_avatar_url(self, obj):
        return ""

    def _dna(self, obj):
        dna, _ = FinancialDNA.objects.get_or_create(user=obj)
        return dna

    def to_representation(self, instance):
        data = super().to_representation(instance)
        dna = getattr(instance, "financial_dna", None)
        if dna is None:
            try:
                dna = instance.financial_dna
            except FinancialDNA.DoesNotExist:
                dna = None
        data["notification_prefs"] = (dna.notification_prefs if dna else {}) or {}
        return data

    def update(self, instance, validated_data):
        prefs = validated_data.pop("notification_prefs", None)
        user = super().update(instance, validated_data)
        if prefs is not None:
            dna = self._dna(user)
            dna.notification_prefs = prefs
            dna.save(update_fields=["notification_prefs", "updated_at"])
        return user

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
            "session",
            "intent_bucket",
            "agents_called",
            "user_query",
            "assistant_response",
            "was_helpful",
            "response_time_ms",
            "created_at",
        )
        read_only_fields = fields


class CoordinatorChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoordinatorChatSession
        fields = ("id", "title", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class CoordinatorChatSessionDetailSerializer(serializers.ModelSerializer):
    outcomes = SkillOutcomeSerializer(many=True, read_only=True)

    class Meta:
        model = CoordinatorChatSession
        fields = ("id", "title", "created_at", "updated_at", "outcomes")
        read_only_fields = fields


class UserGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGoal
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")
