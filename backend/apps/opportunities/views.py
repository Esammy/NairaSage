from rest_framework import viewsets

from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import OpportunitySerializer


class OpportunityViewSet(viewsets.ModelViewSet):
    serializer_class = OpportunitySerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Opportunity.objects.filter(user=self.request.user).order_by(
            "-urgency_score", "-match_score"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
