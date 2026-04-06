from rest_framework import serializers

from apps.goals.models import SavingsGoal


class SavingsGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsGoal
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")
