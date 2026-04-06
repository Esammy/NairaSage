import json
import logging

from decimal import Decimal

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import BillingEvent, Subscription
from apps.billing.serializers import BillingEventSerializer, SubscriptionSerializer
from apps.users.models import User
from integrations.paystack.webhooks import parse_event, verify_paystack_signature

logger = logging.getLogger(__name__)


class SubscriptionView(generics.RetrieveAPIView):
    serializer_class = SubscriptionSerializer

    def get_object(self):
        sub, _ = Subscription.objects.get_or_create(user=self.request.user)
        return sub


class BillingEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BillingEventSerializer

    def get_queryset(self):
        return BillingEvent.objects.filter(user=self.request.user)


@method_decorator(csrf_exempt, name="dispatch")
class PaystackWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw = request.body
        sig = request.headers.get("X-Paystack-Signature", "")
        if not verify_paystack_signature(raw, sig):
            return Response(status=status.HTTP_400_BAD_REQUEST)
        try:
            event = parse_event(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(status=400)
        etype = event.get("event")
        data = event.get("data") or {}
        customer = data.get("customer") or {}
        email = customer.get("email")
        if not email:
            return Response({"ok": True})
        user = User.objects.filter(email=email).first()
        if not user:
            logger.info("Paystack webhook: unknown customer %s", email)
            return Response({"ok": True})
        amount = data.get("amount")
        amount_ngn = None
        if amount is not None:
            amount_ngn = Decimal(str(amount)) / Decimal("100")
        BillingEvent.objects.create(
            user=user,
            event_type=etype or "unknown",
            amount_ngn=amount_ngn,
            paystack_reference=data.get("reference", ""),
            raw_payload=event,
        )
        return Response({"ok": True})
