from django.db import models

from apps.users.models import User


class TaxRecord(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="tax_records"
    )
    tax_year = models.PositiveIntegerField()
    label = models.CharField(max_length=200)
    amount_ngn = models.DecimalField(max_digits=14, decimal_places=2)
    record_type = models.CharField(
        max_length=30,
        choices=[
            ("paye", "PAYE"),
            ("vat", "VAT"),
            ("self_assessment", "Self Assessment"),
            ("deduction", "Deduction"),
            ("other", "Other"),
        ],
        default="other",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-tax_year", "-created_at"]


class TaxDeadline(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="tax_deadlines"
    )
    title = models.CharField(max_length=200)
    due_date = models.DateField()
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
