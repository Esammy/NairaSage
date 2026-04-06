"""Helpers for reading and updating Financial DNA profiles."""

from typing import Any, Dict, Optional

from apps.users.models import FinancialDNA, User


def get_or_create_dna(user: User) -> FinancialDNA:
    dna, _ = FinancialDNA.objects.get_or_create(user=user)
    return dna


def merge_agent_memory(
    user_id: int, agent_name: str, memory_patch: Dict[str, Any]
) -> FinancialDNA:
    dna = FinancialDNA.objects.get(user_id=user_id)
    current = dict(dna.agent_memory.get(agent_name, {}))
    current.update(memory_patch)
    full = dict(dna.agent_memory)
    full[agent_name] = current
    dna.agent_memory = full
    dna.save(update_fields=["agent_memory", "updated_at"])
    return dna


def update_routing_weights(user_id: int, weights: Dict[str, Any]) -> FinancialDNA:
    dna = FinancialDNA.objects.get(user_id=user_id)
    dna.routing_weights = weights
    dna.save(update_fields=["routing_weights", "updated_at"])
    return dna


def get_dna_context_dict(dna: FinancialDNA) -> Dict[str, Optional[str]]:
    return {
        "monthly_income": str(dna.monthly_income) if dna.monthly_income else None,
        "risk_tolerance": dna.risk_tolerance or None,
        "primary_goal": dna.primary_goal or None,
        "life_stage": dna.life_stage or None,
        "financial_literacy_score": dna.financial_literacy_score,
        "occupation": dna.occupation or None,
    }
