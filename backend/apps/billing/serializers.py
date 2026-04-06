from rest_framework import serializers

from apps.billing.models import BillingEvent, Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class BillingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingEvent
        fields = "__all__"
        read_only_fields = ("user", "created_at")
