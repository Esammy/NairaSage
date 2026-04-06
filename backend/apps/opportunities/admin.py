from django.contrib import admin

from apps.opportunities.models import Opportunity


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "opp_type", "match_score", "urgency_score")
