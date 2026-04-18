"""Async skill-gap reporting (off the coordinator request path)."""

from __future__ import annotations

import logging

from django_rq import job
from langchain_core.messages import HumanMessage, SystemMessage

from apps.users.models import SkillGapReport
from core.llm_factory import get_llm

logger = logging.getLogger(__name__)


@job("low")
def flag_skill_gap_report(query: str, bucket: str) -> None:
    """Create or bump a pending SkillGapReport; LLM spec runs in the worker."""
    existing = SkillGapReport.objects.filter(
        query_pattern__icontains=bucket[:50], status="pending"
    ).first()
    if existing:
        existing.frequency += 1
        existing.save(update_fields=["frequency"])
        return
    try:
        gap_llm = get_llm(temperature=0.2, max_tokens=512)
        spec_response = gap_llm.invoke(
            [
                SystemMessage(
                    content=(
                        "Write a brief technical spec for a new NairaSage agent skill "
                        "that would handle this type of user query. Under 200 words."
                    )
                ),
                HumanMessage(content=f"Query: {query}\nBucket: {bucket}"),
            ]
        )
        proposed = getattr(spec_response, "content", str(spec_response))
    except Exception as e:  # noqa: BLE001
        logger.exception("Skill gap LLM failed: %s", e)
        proposed = "(Spec generation failed; see logs.)"
    SkillGapReport.objects.create(
        query_pattern=query[:300],
        proposed_spec=proposed,
    )
