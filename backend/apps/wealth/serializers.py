"""Serializers for the Kiyosaki Rich Dad wealth domain."""

from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.wealth.models import (
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


class FinancialStatementSnapshotSerializer(serializers.ModelSerializer):
    total_income = serializers.SerializerMethodField()
    total_expenses = serializers.SerializerMethodField()
    total_assets = serializers.SerializerMethodField()
    total_liabilities = serializers.SerializerMethodField()
    passive_income = serializers.SerializerMethodField()

    class Meta:
        model = FinancialStatementSnapshot
        fields = "__all__"
        read_only_fields = (
            "user", "net_worth", "freedom_ratio", "created_at", "updated_at",
        )

    def get_total_income(self, obj) -> str:
        total = (obj.income_active or Decimal("0")) + (obj.income_passive or Decimal("0")) + (obj.income_portfolio or Decimal("0"))
        return str(total)

    def get_total_expenses(self, obj) -> str:
        total = (obj.expenses_essential or Decimal("0")) + (obj.expenses_doodad or Decimal("0"))
        return str(total)

    def get_total_assets(self, obj) -> str:
        total = (obj.assets_cashflow or Decimal("0")) + (obj.assets_appreciation or Decimal("0"))
        return str(total)

    def get_total_liabilities(self, obj) -> str:
        total = (obj.liabilities_good or Decimal("0")) + (obj.liabilities_bad or Decimal("0"))
        return str(total)

    def get_passive_income(self, obj) -> str:
        return str((obj.income_passive or Decimal("0")) + (obj.income_portfolio or Decimal("0")))


class AssetItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetItem
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class LiabilityItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiabilityItem
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class QuadrantProfileSerializer(serializers.ModelSerializer):
    dominant = serializers.SerializerMethodField()

    class Meta:
        model = QuadrantProfile
        fields = "__all__"
        read_only_fields = ("user", "updated_at")

    def get_dominant(self, obj) -> str:
        return obj.dominant_quadrant()


class InvestorLevelSerializer(serializers.ModelSerializer):
    current_level_label = serializers.SerializerMethodField()

    class Meta:
        model = InvestorLevel
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")

    def get_current_level_label(self, obj) -> str:
        return obj.get_current_level_display()


class RichDadPhaseSerializer(serializers.ModelSerializer):
    current_phase_label = serializers.SerializerMethodField()

    class Meta:
        model = RichDadPhase
        fields = "__all__"
        read_only_fields = ("user", "updated_at")

    def get_current_phase_label(self, obj) -> str:
        return obj.get_current_phase_display()


class BITriangleScoreSerializer(serializers.ModelSerializer):
    overall = serializers.SerializerMethodField()

    class Meta:
        model = BITriangleScore
        fields = "__all__"
        read_only_fields = ("user", "updated_at")

    def get_overall(self, obj) -> float:
        return round(obj.overall(), 1)


class InvestorControlsChecklistSerializer(serializers.ModelSerializer):
    total = serializers.SerializerMethodField()
    pct = serializers.SerializerMethodField()

    class Meta:
        model = InvestorControlsChecklist
        fields = "__all__"
        read_only_fields = ("updated_at",)

    def get_total(self, obj) -> int:
        return obj.total()

    def get_pct(self, obj) -> float:
        return obj.pct()


class DealSerializer(serializers.ModelSerializer):
    controls = InvestorControlsChecklistSerializer(read_only=True)

    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class NextActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NextAction
        fields = "__all__"
        read_only_fields = ("user", "created_at", "done_at")


class CoachMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachMemory
        fields = (
            "id",
            "kind",
            "content",
            "confidence",
            "created_at",
            "expires_at",
            "is_forgotten",
        )
        read_only_fields = fields


class ActionProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionProposal
        fields = (
            "id",
            "tool",
            "args",
            "human_summary",
            "diff_preview",
            "status",
            "session_id",
            "created_at",
            "confirmed_at",
        )
        read_only_fields = fields
