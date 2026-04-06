from django.db import models

from apps.users.models import User


class SavingsGoal(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="savings_goals"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    saved_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    monthly_auto_save = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
