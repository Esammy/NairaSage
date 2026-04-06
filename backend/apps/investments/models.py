from django.db import models

from apps.users.models import User


class Portfolio(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="portfolio"
    )
    name = models.CharField(max_length=100, default="My Portfolio")
    total_value = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    currency = models.CharField(max_length=5, default="NGN")
    risk_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PortfolioHolding(models.Model):
    ASSET_TYPES = [
        ("ngx_stock", "NGX Stock"),
        ("us_stock", "US Stock"),
        ("mutual_fund", "Mutual Fund"),
        ("tbill", "Treasury Bill"),
        ("bond", "FGN Bond"),
        ("etf", "ETF"),
        ("crypto", "Cryptocurrency"),
        ("real_estate", "Real Estate"),
        ("cash", "Cash / MMF"),
    ]
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, related_name="holdings"
    )
    asset_type = models.CharField(max_length=30, choices=ASSET_TYPES)
    symbol = models.CharField(max_length=20, blank=True)
    name = models.CharField(max_length=200)
    units = models.DecimalField(max_digits=16, decimal_places=6, default=0)
    avg_cost = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    current_price = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    current_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    pnl = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    pnl_pct = models.FloatField(default=0.0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
