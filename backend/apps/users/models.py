from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    bvn_verified = models.BooleanField(default=False)
    tier = models.CharField(
        max_length=10,
        choices=[("free", "Free"), ("pro", "Pro"), ("elite", "Elite")],
        default="free",
    )
    onboarded = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


class FinancialDNA(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="financial_dna"
    )
    primary_goal = models.CharField(max_length=100, blank=True)
    life_stage = models.CharField(max_length=50, blank=True)
    monthly_income = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    income_stability = models.CharField(max_length=20, blank=True)
    occupation = models.CharField(max_length=100, blank=True)
    risk_tolerance = models.CharField(max_length=20, blank=True)
    investment_horizon = models.IntegerField(null=True, blank=True)
    impulse_spend_score = models.FloatField(default=0.0)
    fomo_sensitivity_score = models.FloatField(default=0.0)
    savings_discipline = models.FloatField(default=0.0)
    loss_aversion_score = models.FloatField(default=0.0)
    stress_spend_triggers = models.JSONField(default=list)
    financial_literacy_score = models.IntegerField(default=0)
    completed_modules = models.JSONField(default=list)
    agent_memory = models.JSONField(default=dict)
    routing_weights = models.JSONField(default=dict)
    preferred_language = models.CharField(max_length=20, default="en")
    notification_prefs = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"DNA:{self.user_id}"


class UserGoal(models.Model):
    GOAL_TYPES = [
        ("house", "Buy a House"),
        ("retirement", "Retirement"),
        ("emergency", "Emergency Fund"),
        ("education", "Education"),
        ("business", "Start Business"),
        ("travel", "Travel"),
        ("custom", "Custom"),
    ]
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="goals"
    )
    title = models.CharField(max_length=200)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    current_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0
    )
    target_date = models.DateField(null=True, blank=True)
    monthly_contrib = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    auto_contribute = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def progress_pct(self) -> float:
        if self.target_amount == 0:
            return 0.0
        return float(self.current_amount / self.target_amount * 100)


class SkillOutcome(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="skill_outcomes"
    )
    intent_bucket = models.CharField(max_length=100)
    agents_called = models.JSONField()
    user_query = models.TextField()
    assistant_response = models.TextField(blank=True, default="")
    was_helpful = models.BooleanField(null=True)
    response_time_ms = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class SkillGapReport(models.Model):
    STATUS = [
        ("pending", "Pending Review"),
        ("approved", "Approved — Building"),
        ("shipped", "Shipped"),
        ("rejected", "Rejected"),
    ]
    query_pattern = models.TextField()
    frequency = models.IntegerField(default=1)
    proposed_spec = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
