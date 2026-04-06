from django.db import models

from apps.users.models import User


class Debt(models.Model):
    DEBT_TYPES = [
        ("personal_loan", "Personal Loan"),
        ("mortgage", "Mortgage"),
        ("credit_card", "Credit Card"),
        ("auto_loan", "Auto Loan"),
        ("student_loan", "Student Loan"),
        ("bnpl", "BNPL / Informal"),
        ("other", "Other"),
    ]
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="debts"
    )
    name = models.CharField(max_length=200)
    debt_type = models.CharField(max_length=30, choices=DEBT_TYPES)
    lender = models.CharField(max_length=100, blank=True)
    original_amount = models.DecimalField(max_digits=14, decimal_places=2)
    outstanding = models.DecimalField(max_digits=14, decimal_places=2)
    interest_rate_pct = models.DecimalField(max_digits=6, decimal_places=2)
    monthly_payment = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    is_productive = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
