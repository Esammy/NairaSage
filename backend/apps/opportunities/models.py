from django.db import models

from apps.users.models import User


class Opportunity(models.Model):
    TYPES = [
        ("grant", "Grant / Program"),
        ("investment", "Investment Product"),
        ("ipo", "IPO / New Listing"),
        ("side_income", "Side Income"),
        ("real_estate", "Real Estate Deal"),
        ("bank_product", "Bank Rate / Product"),
        ("tbill", "T-Bill / Bond Rate"),
        ("job", "Contract / Job"),
    ]
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="opportunities"
    )
    opp_type = models.CharField(max_length=30, choices=TYPES)
    title = models.CharField(max_length=300)
    description = models.TextField()
    source_url = models.URLField(blank=True)
    match_score = models.FloatField()
    urgency_score = models.FloatField(default=0)
    deadline = models.DateField(null=True, blank=True)
    estimated_value = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    is_actioned = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    scout_run_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-urgency_score", "-match_score"]
