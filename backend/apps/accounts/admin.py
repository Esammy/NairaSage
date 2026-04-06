from django.contrib import admin

from apps.accounts.models import BankAccount


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("institution", "account_number", "user", "is_active")
    search_fields = ("institution", "mono_account_id")
