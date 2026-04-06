from django.db import models

from apps.users.models import User


class BankAccount(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bank_accounts"
    )
    mono_account_id = models.CharField(max_length=100, unique=True)
    institution = models.CharField(max_length=100)
    account_name = models.CharField(max_length=200)
    account_number = models.CharField(max_length=20)
    account_type = models.CharField(max_length=50)
    currency = models.CharField(max_length=5, default="NGN")
    balance = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    balance_updated = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    linked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.institution} {self.account_number}"
