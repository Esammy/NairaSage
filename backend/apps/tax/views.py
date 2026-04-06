from rest_framework import viewsets

from apps.tax.models import TaxDeadline, TaxRecord
from apps.tax.serializers import TaxDeadlineSerializer, TaxRecordSerializer


class TaxRecordViewSet(viewsets.ModelViewSet):
    serializer_class = TaxRecordSerializer

    def get_queryset(self):
        return TaxRecord.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TaxDeadlineViewSet(viewsets.ModelViewSet):
    serializer_class = TaxDeadlineSerializer

    def get_queryset(self):
        return TaxDeadline.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
