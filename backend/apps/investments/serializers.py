from rest_framework import serializers

from apps.investments.models import Portfolio, PortfolioHolding


class PortfolioHoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioHolding
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")


class PortfolioSerializer(serializers.ModelSerializer):
    holdings = PortfolioHoldingSerializer(many=True, read_only=True)

    class Meta:
        model = Portfolio
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")
