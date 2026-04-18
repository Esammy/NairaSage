"""Cheap keyword routing before the coordinator calls the routing LLM."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set, Tuple

# (keyword regex fragment, agent name, intent bucket fragment)
_RULES: List[Tuple[str, str, str]] = [
    (r"\b(paye|firs|withholding|vat|tax)\b", "tax_advisor", "tax"),
    (r"\b(stock|ngx|equity|t-bill|tbill|bond|etf|dividend|portfolio)\b", "investment_advisor", "investing"),
    (r"\b(risk|concentration|volatility|var\b|drawdown)\b", "risk_assessor", "risk"),
    (r"\b(spend|spending|transaction|budget|cash flow|uncategoriz)\b", "accountant", "spending"),
    (r"\b(debt|loan|interest rate|refinanc|payoff)\b", "debt_manager", "debt"),
    (r"\b(save|savings|emergency fund|piggyvest|cowrywise)\b", "savings_optimizer", "savings"),
    (r"\b(retire|rsa\b|pension|life plan)\b", "life_planner", "life_planning"),
    (r"\b(impulse|fomo|behavior|habit|discipline)\b", "behavioral_coach", "behavioral"),
    (r"\b(inflation|naira|macro|cbn|devaluation|cpi)\b", "economist", "macro"),
    (r"\b(grant|ipo|opportunity|program|youth fund)\b", "opportunity_scout", "opportunities"),
    (r"\b(what is|explain|define|meaning of|teach me|literacy)\b", "education", "education"),
    (r"\b(news|today|latest|breaking|verify|official link|still open)\b", "researcher", "web_verify"),
]


def _normalize(message: str) -> str:
    return " ".join((message or "").strip().lower().split())


def heuristic_route(message: str) -> Optional[Dict[str, Any]]:
    """
    Return a routing-shaped dict if keywords map clearly to one or more agents.
    Otherwise None (caller should use the routing LLM).
    """
    text = _normalize(message)
    if len(text) < 3:
        return None

    matched_agents: List[str] = []
    matched_buckets: Set[str] = set()
    for pattern, agent, bucket in _RULES:
        if re.search(pattern, text, re.I):
            if agent not in matched_agents:
                matched_agents.append(agent)
            matched_buckets.add(bucket)

    if not matched_agents:
        return None

    # Pair researcher with a domain specialist when both match (routing rules).
    if "researcher" in matched_agents and len(matched_agents) > 1:
        others = [a for a in matched_agents if a != "researcher"]
        matched_agents = ["researcher", others[0]]
        if len(others) > 1:
            matched_agents.append(others[1])
    elif "researcher" in matched_agents and len(matched_agents) == 1:
        matched_agents = ["researcher", "opportunity_scout"]

    matched_agents = matched_agents[:3]
    cross_domain = len(matched_buckets) > 1 or len(matched_agents) > 1
    primary_bucket = next(iter(sorted(matched_buckets))) if matched_buckets else "heuristic"
    return {
        "agents": matched_agents,
        "intent_bucket": f"{primary_bucket}_heuristic",
        "cross_domain": cross_domain,
        "reasoning": "Keyword heuristic matched before routing LLM.",
    }
