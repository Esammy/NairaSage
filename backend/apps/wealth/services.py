"""Business logic helpers for the Kiyosaki Rich Dad domain.

Keep the pure rules (level assessment, snapshot composition, next-action
suggestion) out of the views so agents and RQ tasks can reuse them.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Tuple

from django.utils import timezone

from apps.users.models import User
from apps.wealth.models import (
    AssetItem,
    FinancialStatementSnapshot,
    InvestorLevel,
    LiabilityItem,
    NextAction,
    QuadrantProfile,
    RichDadPhase,
)


# --- Level assessment --------------------------------------------------------

def assess_investor_level(
    snapshot: Optional[FinancialStatementSnapshot],
    assets: Iterable[AssetItem],
    liabilities: Iterable[LiabilityItem],
) -> Tuple[int, str, Dict[str, Any]]:
    """Estimate the user's Kiyosaki investor level from their financial picture.

    Returns (level, sublevel, debug) where debug is a breakdown dict.
    Rules (simplified from the book, Part One chapters):
      0 - nothing to invest (zero assets AND freedom_ratio == 0)
      1 - borrower (bad debt exceeds assets)
      2 - saver (has cash but no cashflow assets)
      3 - smart but passive (owns paper assets only)
      4 - long-term investor (owns diversified assets with positive cashflow)
      5 - sophisticated (freedom_ratio >= 0.5, multiple asset classes)
      6 - capitalist (freedom_ratio >= 1.0 - escaped the rat race)
    """
    freedom_ratio = snapshot.freedom_ratio if snapshot else 0.0
    assets_list = list(assets)
    liab_list = list(liabilities)

    total_assets = sum((a.market_value for a in assets_list), Decimal("0"))
    total_bad_debt = sum(
        (l.balance for l in liab_list if not l.is_good_debt), Decimal("0"),
    )
    cashflow_assets = [a for a in assets_list if a.monthly_cashflow and a.monthly_cashflow > 0]
    asset_classes = {a.kiyosaki_type for a in assets_list if a.is_active}
    is_cash_only_saver = asset_classes.issubset({"cash_eq"}) and total_assets > 0

    debug: Dict[str, Any] = {
        "freedom_ratio": freedom_ratio,
        "total_assets": str(total_assets),
        "total_bad_debt": str(total_bad_debt),
        "cashflow_asset_count": len(cashflow_assets),
        "asset_classes": sorted(asset_classes),
    }

    if freedom_ratio >= 1.0:
        return 6, "", debug
    if freedom_ratio >= 0.5 and len(asset_classes - {"cash_eq"}) >= 2:
        return 5, "", debug
    if len(cashflow_assets) >= 1 and len(asset_classes - {"cash_eq"}) >= 2:
        return 4, "", debug
    if "paper" in asset_classes:
        # Level 3 smart but passive; sublevel "a" as conservative default
        return 3, "a", debug
    if is_cash_only_saver:
        return 2, "", debug
    if total_bad_debt > total_assets and total_bad_debt > 0:
        return 1, "", debug
    if total_assets == 0 and not cashflow_assets:
        return 0, "", debug
    return 2, "", debug


# --- Snapshot composition ----------------------------------------------------

@dataclass
class SnapshotInputs:
    period_month: dt.date
    income_active: Decimal = Decimal("0")
    income_passive: Decimal = Decimal("0")
    income_portfolio: Decimal = Decimal("0")
    expenses_essential: Decimal = Decimal("0")
    expenses_doodad: Decimal = Decimal("0")


def compose_snapshot(user: User, inputs: SnapshotInputs) -> FinancialStatementSnapshot:
    """Upsert a FinancialStatementSnapshot for the given user / month.

    Asset and liability totals are derived from the user's AssetItem /
    LiabilityItem rows at the time of compose (they are cumulative, not
    periodic). This keeps the snapshot a true point-in-time statement.
    """
    period_month = inputs.period_month.replace(day=1)
    assets_cashflow = Decimal("0")
    assets_appreciation = Decimal("0")
    for a in AssetItem.objects.filter(user=user, is_active=True):
        if a.monthly_cashflow and a.monthly_cashflow > 0:
            assets_cashflow += a.market_value or Decimal("0")
        else:
            assets_appreciation += a.market_value or Decimal("0")

    liabilities_good = Decimal("0")
    liabilities_bad = Decimal("0")
    for l in LiabilityItem.objects.filter(user=user, is_active=True):
        if l.is_good_debt:
            liabilities_good += l.balance or Decimal("0")
        else:
            liabilities_bad += l.balance or Decimal("0")

    snap, _ = FinancialStatementSnapshot.objects.update_or_create(
        user=user,
        period_month=period_month,
        defaults={
            "income_active": inputs.income_active,
            "income_passive": inputs.income_passive,
            "income_portfolio": inputs.income_portfolio,
            "expenses_essential": inputs.expenses_essential,
            "expenses_doodad": inputs.expenses_doodad,
            "assets_cashflow": assets_cashflow,
            "assets_appreciation": assets_appreciation,
            "liabilities_good": liabilities_good,
            "liabilities_bad": liabilities_bad,
        },
    )
    return snap


# --- Next-action suggestion --------------------------------------------------

NEXT_ACTION_BY_LEVEL = {
    0: {
        "title": "Start with a written monthly financial statement",
        "body": (
            "Kiyosaki's first rule: before you invest a naira, write down "
            "your income, expenses, assets, and liabilities. This is your "
            "report card. Open /wealth/statement and fill it in."
        ),
        "cta_route": "/wealth/statement",
    },
    1: {
        "title": "Attack the highest-interest bad debt first",
        "body": (
            "You are at Level 1 (Borrower). Every naira of interest you pay "
            "on bad debt is a naira that can never buy an asset. List your "
            "liabilities and knock out the highest-APR one."
        ),
        "cta_route": "/wealth/statement",
    },
    2: {
        "title": "Convert one month of savings into a cashflow asset",
        "body": (
            "Savers are losers in Kiyosaki's ladder because inflation eats "
            "cash. Pick one real-world cashflow asset (rental unit, dividend "
            "stock, small side business) and take the first concrete step."
        ),
        "cta_route": "/wealth/deals",
    },
    3: {
        "title": "Move from paper-only investing to a second asset class",
        "body": (
            "Level 3 investors often hide in paper assets alone. Add real "
            "estate, a small business, or IP to diversify into an asset "
            "class you actually control."
        ),
        "cta_route": "/wealth/quadrant",
    },
    4: {
        "title": "Score your next deal against all 10 Investor Controls",
        "body": (
            "Long-term investors graduate to sophisticated by exercising "
            "every one of Kiyosaki's 10 Investor Controls. Open your latest "
            "deal and score each control."
        ),
        "cta_route": "/wealth/deals",
    },
    5: {
        "title": "Build a B-I Triangle for a business you want to own",
        "body": (
            "Sophisticated investors design the business before buying it. "
            "Score the 8 integrities (Mission, Leadership, Team, Product, "
            "Legal, Systems, Communications, Cash Flow)."
        ),
        "cta_route": "/wealth/business",
    },
    6: {
        "title": "Plan how you give it back",
        "body": (
            "You have escaped the rat race. Phase 5 of Kiyosaki's plan is "
            "giving it back, on your terms. Document your philanthropy and "
            "legacy strategy."
        ),
        "cta_route": "/wealth/path",
    },
}


def suggest_next_action(user: User) -> Optional[NextAction]:
    """Create a NextAction for the user based on their current level.

    Skips creation if an identical open action already exists.
    """
    level_obj = getattr(user, "investor_level", None)
    level = level_obj.current_level if level_obj else 0
    spec = NEXT_ACTION_BY_LEVEL.get(level) or NEXT_ACTION_BY_LEVEL[0]

    existing = NextAction.objects.filter(
        user=user, title=spec["title"], is_done=False, is_dismissed=False,
    ).first()
    if existing:
        return existing

    return NextAction.objects.create(
        user=user,
        title=spec["title"],
        body=spec["body"],
        cta_route=spec["cta_route"],
        target_level=level,
    )


# --- Onboarding seeding ------------------------------------------------------

def seed_rich_dad_onboarding(
    user: User,
    primary_motivation: str,
    quadrant_anchor: str,
    phase_anchor: int,
    quadrant_split: Dict[str, float],
    initial_level: int,
) -> None:
    """Called by the onboarding flow to seed the Kiyosaki models in one shot."""
    dna = getattr(user, "financial_dna", None)
    if dna is not None:
        dna.primary_motivation = primary_motivation
        dna.quadrant_anchor = quadrant_anchor
        dna.phase_anchor = phase_anchor
        dna.save(update_fields=["primary_motivation", "quadrant_anchor", "phase_anchor"])

    QuadrantProfile.objects.update_or_create(
        user=user,
        defaults={
            "pct_e": float(quadrant_split.get("E", 0.0)),
            "pct_s": float(quadrant_split.get("S", 0.0)),
            "pct_b": float(quadrant_split.get("B", 0.0)),
            "pct_i": float(quadrant_split.get("I", 0.0)),
            "target_pct_b": float(quadrant_split.get("target_B", 0.0)),
            "target_pct_i": float(quadrant_split.get("target_I", 0.0)),
        },
    )
    lvl, _ = InvestorLevel.objects.update_or_create(
        user=user,
        defaults={
            "current_level": initial_level,
            "last_assessed_at": timezone.now(),
        },
    )
    history = list(lvl.level_history or [])
    history.append({
        "level": initial_level,
        "sublevel": "",
        "changed_at": timezone.now().isoformat(),
        "reason": "rich_dad_onboarding",
    })
    lvl.level_history = history
    lvl.save(update_fields=["level_history"])

    RichDadPhase.objects.update_or_create(
        user=user,
        defaults={"current_phase": phase_anchor},
    )


# --- Phase milestones registry ----------------------------------------------

PHASE_MILESTONES: Dict[int, List[Dict[str, str]]] = {
    1: [
        {"key": "motivation_written", "title": "Write down WHY you want to be rich"},
        {"key": "pay_yourself_first", "title": "Commit to paying yourself first each month"},
        {"key": "face_fears", "title": "Name your top 3 money fears"},
    ],
    2: [
        {"key": "pick_plan", "title": "Pick: plan to be secure, comfortable, or rich"},
        {"key": "pick_investor_type", "title": "Pick: active, passive, or sophisticated investor"},
        {"key": "3e_learning", "title": "Start your 3E's: Education, Experience, Excess cash"},
    ],
    3: [
        {"key": "mission_written", "title": "Write a one-sentence business mission"},
        {"key": "team_draft", "title": "List the team (legal, tax, bank, coach, mentor)"},
        {"key": "first_product", "title": "Define the first product / offer"},
    ],
    4: [
        {"key": "score_controls", "title": "Score 10 Investor Controls on a real deal"},
        {"key": "opm_plan", "title": "Plan to use OPM (other people's money) responsibly"},
        {"key": "tax_entity", "title": "Review your tax entity with a professional"},
    ],
    5: [
        {"key": "philanthropy_plan", "title": "Draft a philanthropy & legacy plan"},
        {"key": "mentor_next", "title": "Mentor one person through Phase 1"},
    ],
}
