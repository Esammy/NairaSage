from django.contrib import admin

from apps.goals.models import SavingsGoal


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "target_amount", "is_active")
