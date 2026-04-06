from rest_framework import viewsets

from apps.accounts.models import BankAccount
from apps.accounts.serializers import BankAccountSerializer


class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user).order_by("-linked_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
