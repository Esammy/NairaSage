from django.contrib import admin

from apps.debt.models import Debt


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "outstanding", "interest_rate_pct")
