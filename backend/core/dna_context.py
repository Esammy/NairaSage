"""Financial DNA formatted for system prompts (coordinator + agents)."""

from apps.users.models import FinancialDNA


def dna_context_for_prompt(dna: FinancialDNA) -> str:
    """Bullet lines only; prompts include their own 'USER PROFILE:' heading."""
    inc = dna.monthly_income
    return (
        f"- Monthly income: NGN {inc if inc is not None else 'unknown'}\n"
        f"- Risk tolerance: {dna.risk_tolerance or 'unknown'}\n"
        f"- Primary goal: {dna.primary_goal or 'unknown'}\n"
        f"- Life stage: {dna.life_stage or 'unknown'}\n"
        f"- Financial literacy: {dna.financial_literacy_score}/100\n"
        f"- Occupation: {dna.occupation or 'unknown'}\n"
        f"- Investment horizon (years): {dna.investment_horizon if dna.investment_horizon is not None else 'unknown'}\n"
        f"- Income stability: {dna.income_stability or 'unknown'}\n"
    )
