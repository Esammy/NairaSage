from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.transactions.models import Transaction
from apps.transactions.serializers import TransactionSerializer


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["category", "type", "account"]

    def get_queryset(self):
        return Transaction.objects.filter(
            account__user=self.request.user
        ).select_related("account")
