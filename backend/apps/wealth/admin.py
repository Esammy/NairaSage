from django.contrib import admin

from apps.wealth.models import (
    ActionAudit,
    ActionProposal,
    AssetItem,
    BITriangleScore,
    CoachMemory,
    Deal,
    FinancialStatementSnapshot,
    InvestorControlsChecklist,
    InvestorLevel,
    LiabilityItem,
    NextAction,
    QuadrantProfile,
    RichDadPhase,
)


@admin.register(FinancialStatementSnapshot)
class FinancialStatementSnapshotAdmin(admin.ModelAdmin):
    list_display = ("user", "period_month", "net_worth", "freedom_ratio")
    list_filter = ("period_month",)
    search_fields = ("user__email",)


@admin.register(AssetItem)
class AssetItemAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "kiyosaki_type", "market_value", "monthly_cashflow", "is_active")
    list_filter = ("kiyosaki_type", "is_active")
    search_fields = ("user__email", "name")


@admin.register(LiabilityItem)
class LiabilityItemAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "balance", "monthly_payment", "is_good_debt", "is_active")
    list_filter = ("is_good_debt", "is_active")
    search_fields = ("user__email", "name")


@admin.register(QuadrantProfile)
class QuadrantProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "pct_e", "pct_s", "pct_b", "pct_i")


@admin.register(InvestorLevel)
class InvestorLevelAdmin(admin.ModelAdmin):
    list_display = ("user", "current_level", "current_sublevel", "last_assessed_at")
    list_filter = ("current_level",)


@admin.register(RichDadPhase)
class RichDadPhaseAdmin(admin.ModelAdmin):
    list_display = ("user", "current_phase", "updated_at")
    list_filter = ("current_phase",)


@admin.register(BITriangleScore)
class BITriangleScoreAdmin(admin.ModelAdmin):
    list_display = ("user", "mission", "leadership", "team", "cashflow")


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "deal_type", "status", "entry_price")
    list_filter = ("deal_type", "status")
    search_fields = ("user__email", "title")


@admin.register(InvestorControlsChecklist)
class InvestorControlsChecklistAdmin(admin.ModelAdmin):
    list_display = ("deal", "control_1_self", "control_4_taxes", "control_8_terms")


@admin.register(NextAction)
class NextActionAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "target_level", "is_done", "is_dismissed", "created_at")
    list_filter = ("is_done", "is_dismissed", "target_level")
    search_fields = ("user__email", "title")


@admin.register(CoachMemory)
class CoachMemoryAdmin(admin.ModelAdmin):
    list_display = ("user", "kind", "content", "confidence", "is_forgotten", "created_at")
    list_filter = ("kind", "is_forgotten")
    search_fields = ("user__email", "content")


@admin.register(ActionProposal)
class ActionProposalAdmin(admin.ModelAdmin):
    list_display = ("user", "tool", "status", "created_at", "session_id")
    list_filter = ("status", "tool")
    search_fields = ("user__email", "human_summary")


@admin.register(ActionAudit)
class ActionAuditAdmin(admin.ModelAdmin):
    list_display = ("user", "tool", "status", "created_at", "proposal_id")
    list_filter = ("status", "tool")
    search_fields = ("user__email", "error_message")
