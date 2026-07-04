"""Skills + context builders for the Rich Dad Coach.

Produces a compact `RICH_DAD_CONTEXT` string for prompt injection. The
string surfaces the user's current Kiyosaki state so the coach can speak
in frame without hallucinating numbers.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional

from apps.users.models import FinancialDNA, User
from apps.wealth.models import (
    AssetItem,
    FinancialStatementSnapshot,
    InvestorLevel,
    LiabilityItem,
    QuadrantProfile,
    RichDadPhase,
)


def _fmt(v: Decimal | None) -> str:
    if v is None:
        return "NGN 0"
    return f"NGN {v:,.2f}"


def build_rich_dad_context(user_id: int) -> str:
    """Compact, human-readable state for the Rich Dad Coach system prompt."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return "(No user state available.)"

    dna: Optional[FinancialDNA] = getattr(user, "financial_dna", None)
    level: Optional[InvestorLevel] = getattr(user, "investor_level", None)
    phase: Optional[RichDadPhase] = getattr(user, "rich_dad_phase", None)
    quadrant: Optional[QuadrantProfile] = getattr(user, "quadrant_profile", None)
    snap = (
        FinancialStatementSnapshot.objects.filter(user=user)
        .order_by("-period_month")
        .first()
    )
    assets = list(AssetItem.objects.filter(user=user, is_active=True)[:20])
    liabilities = list(LiabilityItem.objects.filter(user=user, is_active=True)[:20])

    lines = []

    motivation = dna.primary_motivation if dna else ""
    lines.append(
        "Primary motivation: "
        + (motivation or "not set (ask the user: security, comfort, rich, or wealthy?)")
    )

    if level is not None:
        lines.append(
            f"Current Investor Level: {level.current_level}"
            + (f" ({level.current_sublevel})" if level.current_sublevel else "")
        )
    else:
        lines.append("Current Investor Level: unknown (assessment not run yet)")

    if phase is not None:
        lines.append(f"Current Phase: {phase.current_phase}")
    else:
        lines.append("Current Phase: unknown")

    if quadrant is not None:
        lines.append(
            "CASHFLOW Quadrant today: "
            f"E={quadrant.pct_e:.0f}% S={quadrant.pct_s:.0f}% "
            f"B={quadrant.pct_b:.0f}% I={quadrant.pct_i:.0f}% "
            f"(target B={quadrant.target_pct_b:.0f}%, target I={quadrant.target_pct_i:.0f}%)"
        )
    else:
        lines.append("CASHFLOW Quadrant: not set")

    if snap is not None:
        lines.append(
            f"Latest Financial Statement ({snap.period_month}):"
        )
        lines.append(
            f"  Income: active={_fmt(snap.income_active)}, "
            f"passive={_fmt(snap.income_passive)}, portfolio={_fmt(snap.income_portfolio)}"
        )
        lines.append(
            f"  Expenses: essential={_fmt(snap.expenses_essential)}, "
            f"doodad={_fmt(snap.expenses_doodad)}"
        )
        lines.append(
            f"  Assets: cashflow-producing={_fmt(snap.assets_cashflow)}, "
            f"appreciation-only={_fmt(snap.assets_appreciation)}"
        )
        lines.append(
            f"  Liabilities: good={_fmt(snap.liabilities_good)}, "
            f"bad={_fmt(snap.liabilities_bad)}"
        )
        lines.append(
            f"  Net worth: {_fmt(snap.net_worth)}, Freedom Ratio: {snap.freedom_ratio:.2f}"
        )
    else:
        lines.append("Financial Statement: no snapshot yet")

    if assets:
        lines.append("Assets on file (Kiyosaki classification):")
        for a in assets:
            lines.append(
                f"  - {a.name} ({a.kiyosaki_type}): value {_fmt(a.market_value)}, "
                f"monthly cashflow {_fmt(a.monthly_cashflow)}"
            )
    else:
        lines.append("Assets on file: none")

    if liabilities:
        lines.append("Liabilities on file:")
        for l in liabilities:
            tag = "good debt" if l.is_good_debt else "bad debt"
            lines.append(
                f"  - {l.name} [{tag}]: balance {_fmt(l.balance)}, "
                f"monthly payment {_fmt(l.monthly_payment)}"
            )
    else:
        lines.append("Liabilities on file: none")

    return "\n".join(lines)


def rich_dad_state_dict(user_id: int) -> Dict[str, Any]:
    """Structured state used for deterministic routing / tests."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {}
    level = getattr(user, "investor_level", None)
    phase = getattr(user, "rich_dad_phase", None)
    snap = (
        FinancialStatementSnapshot.objects.filter(user=user)
        .order_by("-period_month")
        .first()
    )
    return {
        "level": level.current_level if level else None,
        "sublevel": level.current_sublevel if level else "",
        "phase": phase.current_phase if phase else None,
        "freedom_ratio": snap.freedom_ratio if snap else 0.0,
        "net_worth": str(snap.net_worth) if snap else "0",
    }
