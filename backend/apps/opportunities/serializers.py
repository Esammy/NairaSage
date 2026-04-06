from rest_framework import serializers

from apps.opportunities.models import Opportunity


class OpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = "__all__"
        read_only_fields = ("user", "scout_run_at", "created_at", "updated_at")
