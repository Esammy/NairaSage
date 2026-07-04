"""RQ tasks for the Rich Dad Wealth OS domain.

Runs nightly to:
1. Recompute the current-month FinancialStatementSnapshot for every active user
   (aggregates income/expenses from Transaction rows; assets/liabilities from
   AssetItem / LiabilityItem rows).
2. Re-assess the user's Kiyosaki investor level and append a history entry if
   it changed.
3. Generate a next-action suggestion (the "One thing to do today" card).
"""

from __future__ import annotations

import datetime as dt
import logging
from decimal import Decimal
from typing import Iterable

from django.db.models import Sum
from django.utils import timezone
from django_rq import job

from apps.transactions.models import Transaction
from apps.users.models import User
from apps.wealth.models import (
    AssetItem,
    FinancialStatementSnapshot,
    InvestorLevel,
    LiabilityItem,
    NextAction,
)
from apps.wealth.services import (
    SnapshotInputs,
    assess_investor_level,
    compose_snapshot,
    suggest_next_action,
)

logger = logging.getLogger(__name__)


# Kiyosaki-flavoured category split. Categories that indicate passive / portfolio
# income credits vs active income. Anything else is treated as active.
PASSIVE_INCOME_CATEGORIES = {"rent", "investment"}
PORTFOLIO_INCOME_CATEGORIES = {"investment"}

DOODAD_CATEGORIES = {
    "entertainment",
    "shopping",
    "subscription",
}


def _month_bounds(period_month: dt.date) -> tuple[dt.date, dt.date]:
    first = period_month.replace(day=1)
    if first.month == 12:
        next_first = first.replace(year=first.year + 1, month=1)
    else:
        next_first = first.replace(month=first.month + 1)
    return first, next_first


def _aggregate_transactions_for_month(user_id: int, period_month: dt.date) -> SnapshotInputs:
    first, next_first = _month_bounds(period_month)
    qs = Transaction.objects.filter(
        account__user_id=user_id,
        date__gte=first,
        date__lt=next_first,
    )
    income_active = Decimal("0")
    income_passive = Decimal("0")
    income_portfolio = Decimal("0")
    expenses_essential = Decimal("0")
    expenses_doodad = Decimal("0")
    for t in qs.iterator():
        amt = t.amount or Decimal("0")
        if t.type == "credit":
            cat = (t.category or "").lower()
            if cat in PORTFOLIO_INCOME_CATEGORIES:
                income_portfolio += amt
            elif cat in PASSIVE_INCOME_CATEGORIES:
                income_passive += amt
            else:
                income_active += amt
        else:
            cat = (t.category or "").lower()
            if cat in DOODAD_CATEGORIES:
                expenses_doodad += amt
            else:
                expenses_essential += amt
    return SnapshotInputs(
        period_month=first,
        income_active=income_active,
        income_passive=income_passive,
        income_portfolio=income_portfolio,
        expenses_essential=expenses_essential,
        expenses_doodad=expenses_doodad,
    )


def _refresh_snapshot_for(user: User) -> FinancialStatementSnapshot:
    today = dt.date.today().replace(day=1)
    inputs = _aggregate_transactions_for_month(user.id, today)
    return compose_snapshot(user, inputs)


def _reassess_level(user: User, snap: FinancialStatementSnapshot) -> bool:
    """Returns True if the level actually changed."""
    lvl, _ = InvestorLevel.objects.get_or_create(user=user)
    assets = AssetItem.objects.filter(user=user, is_active=True)
    liabilities = LiabilityItem.objects.filter(user=user, is_active=True)
    new_level, new_sublevel, debug = assess_investor_level(snap, assets, liabilities)
    changed = (new_level != lvl.current_level) or (new_sublevel != lvl.current_sublevel)
    if changed:
        history = list(lvl.level_history or [])
        history.append({
            "level": new_level,
            "sublevel": new_sublevel,
            "changed_at": timezone.now().isoformat(),
            "reason": "nightly_reassessment",
            "debug": debug,
        })
        lvl.level_history = history
    lvl.current_level = new_level
    lvl.current_sublevel = new_sublevel
    lvl.last_assessed_at = timezone.now()
    lvl.last_assessment_score = debug
    lvl.save()
    return changed


@job("low")
def refresh_user_wealth(user_id: int) -> None:
    """Per-user nightly refresh: snapshot -> level -> next action."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return
    try:
        snap = _refresh_snapshot_for(user)
    except Exception as e:  # noqa: BLE001
        logger.exception("Snapshot refresh failed for %s: %s", user_id, e)
        return
    try:
        changed = _reassess_level(user, snap)
    except Exception as e:  # noqa: BLE001
        logger.exception("Level reassessment failed for %s: %s", user_id, e)
        changed = False
    try:
        suggest_next_action(user)
    except Exception as e:  # noqa: BLE001
        logger.exception("Next-action suggestion failed for %s: %s", user_id, e)
    logger.info(
        "wealth_refresh user=%s level_changed=%s freedom_ratio=%.2f",
        user_id, changed, snap.freedom_ratio,
    )


@job("low")
def refresh_all_wealth() -> None:
    """Nightly batch job - scheduled by tasks.scheduler.setup_scheduled_tasks."""
    uids: Iterable[int] = User.objects.filter(is_active=True).values_list("id", flat=True)
    for uid in uids:
        refresh_user_wealth.delay(uid)


@job("low")
def mark_stale_next_actions() -> None:
    """Dismiss next-actions older than 14 days that the user never touched."""
    cutoff = timezone.now() - dt.timedelta(days=14)
    NextAction.objects.filter(
        is_done=False, is_dismissed=False, created_at__lt=cutoff,
    ).update(is_dismissed=True)
