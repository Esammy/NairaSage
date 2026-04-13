"""Keep Portfolio.total_value aligned with sum of holding current_value."""

from decimal import Decimal

from django.db.models import Sum
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.investments.models import Portfolio, PortfolioHolding


def refresh_portfolio_total_value(portfolio_id: int) -> None:
    agg = PortfolioHolding.objects.filter(portfolio_id=portfolio_id).aggregate(
        total=Sum("current_value"),
    )
    total = agg["total"] if agg["total"] is not None else Decimal("0")
    Portfolio.objects.filter(pk=portfolio_id).update(total_value=total)


@receiver(post_save, sender=PortfolioHolding)
def portfolio_holding_saved(sender, instance, **kwargs):
    refresh_portfolio_total_value(instance.portfolio_id)


@receiver(post_delete, sender=PortfolioHolding)
def portfolio_holding_deleted(sender, instance, **kwargs):
    refresh_portfolio_total_value(instance.portfolio_id)
