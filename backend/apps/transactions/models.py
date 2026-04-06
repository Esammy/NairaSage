from django.db import models

from apps.accounts.models import BankAccount


class Transaction(models.Model):
    TYPES = [("credit", "Credit"), ("debit", "Debit")]
    CATEGORIES = [
        ("food_dining", "Food & Dining"),
        ("transport", "Transport"),
        ("utilities", "Utilities"),
        ("entertainment", "Entertainment"),
        ("health", "Healthcare"),
        ("education", "Education"),
        ("investment", "Investment"),
        ("savings", "Savings"),
        ("income", "Income"),
        ("transfer", "Transfer"),
        ("subscription", "Subscriptions"),
        ("shopping", "Shopping"),
        ("rent", "Rent / Housing"),
        ("insurance", "Insurance"),
        ("loan_repayment", "Loan Repayment"),
        ("other", "Other"),
    ]

    account = models.ForeignKey(
        BankAccount, on_delete=models.CASCADE, related_name="transactions"
    )
    mono_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPES)
    description = models.CharField(max_length=500)
    category = models.CharField(max_length=30, choices=CATEGORIES, blank=True)
    ai_category = models.CharField(max_length=30, blank=True)
    ai_confidence = models.FloatField(default=0.0)
    merchant = models.CharField(max_length=200, blank=True)
    date = models.DateField()
    balance = models.DecimalField(max_digits=14, decimal_places=2)
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.CharField(max_length=200, blank=True)
    flag_type = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["account", "date"]),
            models.Index(fields=["account", "category"]),
        ]
