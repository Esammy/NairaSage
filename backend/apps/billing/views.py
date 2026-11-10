from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import BillingEvent, Subscription
from apps.billing.serializers import BillingEventSerializer, SubscriptionSerializer
from apps.users.models import User
from integrations.paystack.client import PaystackClient
from integrations.paystack.webhooks import parse_event, verify_paystack_signature

logger = logging.getLogger(__name__)


def _extract_subscription_fields(data: dict) -> tuple:
    """Best-effort parse of Paystack webhook `data` object."""
    customer = data.get("customer")
    email = None
    customer_code = ""
    if isinstance(customer, dict):
        email = customer.get("email")
        customer_code = customer.get("customer_code") or ""
    elif isinstance(customer, str):
        customer_code = customer

    plan = data.get("plan")
    plan_code = ""
    if isinstance(plan, dict):
        plan_code = plan.get("plan_code") or plan.get("plan_code".upper()) or ""

    sub = data.get("subscription")
    sub_code = data.get("subscription_code") or ""
    sub_status = ""
    next_payment = None
    if isinstance(sub, dict):
        sub_code = sub.get("subscription_code") or sub_code
        sub_status = (sub.get("status") or "").lower()
        next_payment = sub.get("next_payment_date")
    if not plan_code and isinstance(sub, dict) and isinstance(sub.get("plan"), dict):
        plan_code = sub["plan"].get("plan_code") or ""

    return email, customer_code, plan_code, sub_code, sub_status, next_payment


def _tier_for_plan_code(plan_code: str) -> str | None:
    if not plan_code:
        return None
    pc = plan_code.strip()
    pro = (getattr(settings, "PAYSTACK_PLAN_PRO", "") or "").strip()
    elite = (getattr(settings, "PAYSTACK_PLAN_ELITE", "") or "").strip()
    starter = (getattr(settings, "PAYSTACK_PLAN_STARTER", "") or "").strip()
    if elite and pc == elite:
        return "elite"
    if pro and pc == pro:
        return "pro"
    if starter and pc == starter:
        return "pro"
    return None


def _sync_user_subscription(user: User, etype: str, data: dict) -> None:
    email, customer_code, plan_code, sub_code, sub_status, next_payment = _extract_subscription_fields(
        data
    )
    if email and email.lower() != user.email.lower():
        logger.warning("paystack webhook email mismatch for user %s", user.pk)

    sub, _ = Subscription.objects.get_or_create(user=user)
    if customer_code:
        sub.paystack_customer_code = customer_code
    if sub_code:
        sub.paystack_subscription_code = sub_code
    if plan_code:
        sub.plan_code = plan_code

    active_events = {
        "subscription.create",
        "subscription.enable",
        "invoice.create",
        "invoice.update",
        "charge.success",
    }
    inactive_events = {
        "subscription.disable",
        "subscription.not_renew",
    }

    if etype in active_events:
        if sub_code or plan_code or sub_status == "active":
            sub.status = "active"
    elif etype in inactive_events:
        sub.status = "canceled"

    if sub_status == "active":
        sub.status = "active"
    if sub_status in ("cancelled", "canceled", "non-renewing"):
        sub.status = "canceled"
    if sub_status == "past_due":
        sub.status = "past_due"

    if next_payment:
        dt = parse_datetime(str(next_payment))
        if dt is not None:
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            sub.current_period_end = dt

    sub.save()

    tier = _tier_for_plan_code(plan_code)
    if tier and sub.status == "active":
        if user.tier != tier:
            user.tier = tier
            user.save(update_fields=["tier", "updated_at"])
    elif sub.status == "canceled" and user.tier in ("pro", "elite"):
        user.tier = "free"
        user.save(update_fields=["tier", "updated_at"])


class SubscriptionView(generics.RetrieveAPIView):
    serializer_class = SubscriptionSerializer

    def get_object(self):
        sub, _ = Subscription.objects.get_or_create(user=self.request.user)
        return sub


class BillingEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BillingEventSerializer

    def get_queryset(self):
        return BillingEvent.objects.filter(user=self.request.user)


class PaystackSubscribeView(APIView):
    """Start Paystack subscription checkout (redirect URL)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_key = (request.data.get("plan") or "").strip().lower()
        plan_codes = {
            "pro": getattr(settings, "PAYSTACK_PLAN_PRO", "") or "",
            "elite": getattr(settings, "PAYSTACK_PLAN_ELITE", "")
            or getattr(settings, "PAYSTACK_PLAN_PRO", "")
            or "",
        }
        plan_code = plan_codes.get(plan_key)
        if not plan_code:
            return Response(
                {"detail": "Invalid plan or Paystack plan code not configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        client = PaystackClient()
        callback = getattr(settings, "PAYSTACK_CALLBACK_URL", "") or ""
        result = client.initialize_subscription(
            email=request.user.email,
            plan_code=plan_code,
            callback_url=callback,
            metadata={"user_id": request.user.id, "plan": plan_key},
        )
        if not result.get("status"):
            return Response(
                {"detail": result.get("message") or "Paystack error"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        inner = result.get("data") or {}
        return Response(
            {
                "authorization_url": inner.get("authorization_url"),
                "reference": inner.get("reference"),
            }
        )


class PaystackPublicConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "public_key": getattr(settings, "PAYSTACK_PUBLIC_KEY", "") or "",
            }
        )


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
        email = customer.get("email") if isinstance(customer, dict) else None
        if not email:
            email = data.get("email")
        amount = data.get("amount")
        amount_ngn = None
        if amount is not None:
            try:
                amount_ngn = Decimal(str(amount)) / Decimal("100")
            except InvalidOperation:
                amount_ngn = None

        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()
        meta = data.get("metadata") or {}
        if user is None and isinstance(meta, dict) and meta.get("user_id"):
            try:
                user = User.objects.filter(pk=int(meta["user_id"])).first()
            except (TypeError, ValueError):
                user = None

        if user:
            reference = str(data.get("reference") or "")
            if reference and BillingEvent.objects.filter(
                user=user, event_type=etype or "unknown", paystack_reference=reference
            ).exists():
                # Paystack retries / replays: already processed.
                return Response({"ok": True, "duplicate": True})
            BillingEvent.objects.create(
                user=user,
                event_type=etype or "unknown",
                amount_ngn=amount_ngn,
                paystack_reference=reference,
                raw_payload=event,
            )
            try:
                _sync_user_subscription(user, etype or "", data)
            except Exception:
                logger.exception("paystack subscription sync failed user_id=%s", user.pk)
        else:
            logger.info("Paystack webhook: no user for email=%s event=%s", email, etype)

        return Response({"ok": True})
