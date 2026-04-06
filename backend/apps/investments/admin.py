from django.contrib import admin

from apps.investments.models import Portfolio, PortfolioHolding


class HoldingInline(admin.TabularInline):
    model = PortfolioHolding
    extra = 0


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    inlines = [HoldingInline]
    list_display = ("user", "name", "total_value", "currency")
