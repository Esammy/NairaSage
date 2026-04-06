from rest_framework import serializers

from apps.accounts.models import BankAccount


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = "__all__"
        read_only_fields = ("user", "linked_at", "updated_at")
