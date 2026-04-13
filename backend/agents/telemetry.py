"""Structured coordinator metrics for logs / APM (not shown to end users)."""

from __future__ import annotations

import logging
from typing import Iterable, Optional

logger = logging.getLogger(__name__)


def log_coordinator_turn(
    *,
    phase: str,
    user_id: int,
    intent_bucket: str,
    agents: Iterable[str],
    outcome_id: Optional[int] = None,
    ms: Optional[int] = None,
    response_length: Optional[int] = None,
) -> None:
    agent_list = ",".join(agents)
    logger.info(
        "COORD_METRIC phase=%s user_id=%s intent=%s agents=%s outcome_id=%s ms=%s resp_len=%s",
        phase,
        user_id,
        intent_bucket,
        agent_list,
        outcome_id if outcome_id is not None else "",
        ms if ms is not None else "",
        response_length if response_length is not None else "",
    )
