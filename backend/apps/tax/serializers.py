from rest_framework import serializers

from apps.tax.models import TaxDeadline, TaxRecord


class TaxRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRecord
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class TaxDeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxDeadline
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")
