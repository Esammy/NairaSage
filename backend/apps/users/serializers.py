from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import FinancialDNA, User, UserGoal


class UserSerializer(serializers.ModelSerializer):
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
            "created_at",
        )
        read_only_fields = ("id", "bvn_verified", "tier", "onboarded", "created_at")


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
        return user


class FinancialDNASerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialDNA
        exclude = ("user",)


class UserGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGoal
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")
