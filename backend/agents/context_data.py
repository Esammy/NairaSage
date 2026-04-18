"""Build placeholder strings for agent system prompts from ORM data."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from apps.debt.models import Debt
from apps.goals.models import SavingsGoal
from apps.investments.models import Portfolio, PortfolioHolding
from apps.transactions.models import Transaction
from apps.users.models import FinancialDNA, UserGoal


def _fmt_money(v: Decimal | None) -> str:
    if v is None:
        return "—"
    return f"NGN {v:,.2f}"


def build_transaction_summary(user_id: int, limit: int = 40) -> str:
    qs = (
        Transaction.objects.filter(account__user_id=user_id)
        .select_related("account")
        .order_by("-date", "-created_at")[:limit]
    )
    rows = list(qs)
    if not rows:
        return (
            "No transactions synced yet. Advise using DNA and general guidance only; "
            "do not invent transaction amounts."
        )
    lines = [
        f"Recent transactions (last {len(rows)}): date | type | amount | category | description"
    ]
    for t in rows:
        lines.append(
            f"{t.date} | {t.type} | {_fmt_money(t.amount)} | {t.category or 'uncategorized'} | {t.description[:80]}"
        )
    agg = Transaction.objects.filter(account__user_id=user_id).aggregate(
        debit=Sum("amount", filter=Q(type="debit")),
        credit=Sum("amount", filter=Q(type="credit")),
    )
    debit_total = agg["debit"] or 0
    credit_total = agg["credit"] or 0
    lines.append(f"All-time totals — credits: {_fmt_money(credit_total)}, debits: {_fmt_money(debit_total)}")
    return "\n".join(lines)


def build_macro_data() -> str:
    today = timezone.now().date().isoformat()
    return (
        f"As-of date for this context block: {today}. "
        "Nigeria macro figures change frequently — if you lack live CPI/MPR/FX, say so and "
        "give scenario ranges, not dated point estimates. "
        "Typical themes: high headline inflation vs nominal yields, CBN MPR moves, "
        "Naira volatility, oil/Fed spillovers to NGX and T-bill auctions."
    )


def build_tax_data(user_id: int, dna: FinancialDNA) -> str:
    parts = [
        f"Declared monthly income (DNA): {_fmt_money(dna.monthly_income)}",
        f"Occupation: {dna.occupation or 'unknown'}",
    ]
    n = Transaction.objects.filter(account__user_id=user_id).count()
    parts.append(f"Synced transactions count: {n}")
    return "\n".join(parts)


def build_behavioral_data(dna: FinancialDNA) -> str:
    triggers = dna.stress_spend_triggers or []
    trig = ", ".join(str(x) for x in triggers[:8]) if triggers else "none recorded"
    return (
        f"Impulse spend score (0–1): {dna.impulse_spend_score:.2f}\n"
        f"FOMO sensitivity (0–1): {dna.fomo_sensitivity_score:.2f}\n"
        f"Savings discipline (0–1): {dna.savings_discipline:.2f}\n"
        f"Loss aversion (0–1): {dna.loss_aversion_score:.2f}\n"
        f"Stress spend triggers: {trig}"
    )


def build_debt_data(user_id: int) -> str:
    debts = list(Debt.objects.filter(user_id=user_id).order_by("-outstanding"))
    if not debts:
        return "No debt records in NairaSage. Ask the user for balances/rates before detailed payoff math."
    lines = ["Lender | Type | Outstanding | Rate % | Monthly pmt | Productive?"]
    for d in debts:
        lines.append(
            f"{d.lender or d.name} | {d.debt_type} | {_fmt_money(d.outstanding)} | "
            f"{d.interest_rate_pct}% | {_fmt_money(d.monthly_payment)} | {d.is_productive}"
        )
    return "\n".join(lines)


def build_goals_data(user_id: int) -> str:
    ug = list(UserGoal.objects.filter(user_id=user_id, status="active"))
    sg = list(SavingsGoal.objects.filter(user_id=user_id, is_active=True))
    if not ug and not sg:
        return "No active goals stored. Use DNA primary goal and ask clarifying questions."
    lines = []
    if ug:
        lines.append("User goals (auth app):")
        for g in ug:
            lines.append(
                f"- {g.title} ({g.goal_type}): {_fmt_money(g.current_amount)} / {_fmt_money(g.target_amount)}"
            )
    if sg:
        lines.append("Savings goals:")
        for g in sg:
            lines.append(
                f"- {g.title}: {_fmt_money(g.saved_amount)} / {_fmt_money(g.target_amount)}"
            )
    return "\n".join(lines)


def build_portfolio_data(user_id: int) -> str:
    try:
        p = Portfolio.objects.prefetch_related("holdings").get(user_id=user_id)
    except Portfolio.DoesNotExist:
        return "No portfolio on file. Risk analysis should flag insufficient data."
    lines = [
        f"Portfolio: {p.name} | Total value: {_fmt_money(p.total_value)} | "
        f"Currency: {p.currency} | Stored risk_score: {p.risk_score}"
    ]
    for h in p.holdings.all()[:30]:
        lines.append(
            f"- {h.name} ({h.asset_type} {h.symbol}): value {_fmt_money(h.current_value)}, "
            f"PnL {_fmt_money(h.pnl)} ({h.pnl_pct:.1f}%)"
        )
    return "\n".join(lines)


def build_education_extras(dna: FinancialDNA) -> dict[str, str]:
    modules = dna.completed_modules or []
    mod_str = ", ".join(str(m) for m in modules[:20]) if modules else "none yet"
    return {
        "LITERACY_SCORE": str(dna.financial_literacy_score),
        "COMPLETED_MODULES": mod_str,
        "WEAK_AREAS": "Not tracked in DB yet — infer from conversation and literacy score.",
    }
