from django.db import models

from apps.users.models import User


class Subscription(models.Model):
    STATUS = [
        ("inactive", "Inactive"),
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("canceled", "Canceled"),
    ]
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="subscription"
    )
    paystack_customer_code = models.CharField(max_length=100, blank=True)
    paystack_subscription_code = models.CharField(max_length=100, blank=True)
    plan_code = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="inactive")
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class BillingEvent(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="billing_events"
    )
    event_type = models.CharField(max_length=50)
    amount_ngn = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    paystack_reference = models.CharField(max_length=200, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
