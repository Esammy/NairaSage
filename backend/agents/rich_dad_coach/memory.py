"""Coach long-term memory: extract, store, retrieve."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

from django.utils import timezone
from langchain_core.messages import HumanMessage, SystemMessage

from apps.wealth.models import CoachMemory
from core.llm_factory import get_llm
from core.utils import extract_json_object

logger = logging.getLogger(__name__)

_KIND_PRIORITY = {
    "decision": 0,
    "goal": 1,
    "risk": 2,
    "preference": 3,
    "fact": 4,
}

_EXTRACT_SYSTEM = """
You extract durable memories about the user from a coach conversation turn.
Return ONLY valid JSON: {"memories": [{"kind": "preference"|"goal"|"fact"|"risk"|"decision", "content": "short third-person fact", "confidence": 0.0-1.0, "expires_at": null or "YYYY-MM-DD"}]}
Rules:
- At most 4 memories; skip small talk.
- Each content is one sentence, no quotes from books.
- If nothing worth storing, return {"memories": []}.
"""


def _hash_content(text: str) -> str:
    return hashlib.sha256((text or "").strip().encode("utf-8")).hexdigest()


def top_memories(user_id: int, k: int = 8) -> List[CoachMemory]:
    qs = (
        CoachMemory.objects.filter(user_id=user_id, is_forgotten=False)
        .exclude(content="")
        .order_by("-created_at")[: max(k * 4, 24)]
    )
    rows = list(qs)
    now = timezone.now()

    def sort_key(m: CoachMemory):
        exp = m.expires_at
        if exp and exp < now:
            return (99, 0, m.created_at)
        pri = _KIND_PRIORITY.get(m.kind, 5)
        return (pri, -m.confidence, m.created_at)

    rows.sort(key=sort_key)
    out: List[CoachMemory] = []
    seen = set()
    for m in rows:
        if m.expires_at and m.expires_at < now:
            continue
        h = _hash_content(m.content)
        if h in seen:
            continue
        seen.add(h)
        out.append(m)
        if len(out) >= k:
            break
    return out


def format_memories(memories: List[CoachMemory]) -> str:
    if not memories:
        return "(No stored memories yet.)"
    lines = []
    for m in memories:
        lines.append(f"- [{m.kind}] (id={m.pk}) {m.content}")
    return "\n".join(lines)


def extract_and_store(
    user_id: int,
    user_text: str,
    assistant_text: str,
    *,
    source_session: str = "",
    source_turn_id: Optional[int] = None,
) -> None:
    user_text = (user_text or "").strip()
    assistant_text = (assistant_text or "").strip()
    if len(user_text) < 8 and len(assistant_text) < 20:
        return

    try:
        llm = get_llm(temperature=0.1, max_tokens=512)
        response = llm.invoke(
            [
                SystemMessage(content=_EXTRACT_SYSTEM),
                HumanMessage(
                    content=(
                        f"User:\n{user_text[:4000]}\n\nAssistant:\n{assistant_text[:6000]}"
                    )
                ),
            ]
        )
        raw = getattr(response, "content", "") or ""
        data = json.loads(extract_json_object(raw))
    except Exception as e:  # noqa: BLE001
        logger.warning("Coach memory extract failed: %s", e)
        return

    memories = data.get("memories") if isinstance(data, dict) else None
    if not isinstance(memories, list):
        return

    for item in memories:
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind", "fact"))[:24]
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        try:
            confidence = float(item.get("confidence", 0.7))
        except (TypeError, ValueError):
            confidence = 0.7
        confidence = max(0.0, min(1.0, confidence))

        exp_raw = item.get("expires_at")
        expires_at = None
        if exp_raw and isinstance(exp_raw, str) and exp_raw.lower() not in ("null", ""):
            try:
                from datetime import date, datetime, time as dtime

                d = date.fromisoformat(exp_raw[:10])
                expires_at = timezone.make_aware(datetime.combine(d, dtime.min))
            except Exception:  # noqa: BLE001
                expires_at = None

        h = _hash_content(content)
        if CoachMemory.objects.filter(
            user_id=user_id, content_hash=h, is_forgotten=False
        ).exists():
            continue

        CoachMemory.objects.create(
            user_id=user_id,
            kind=kind,
            content=content,
            source_session=source_session[:64],
            source_turn_id=source_turn_id,
            confidence=confidence,
            content_hash=h,
            expires_at=expires_at,
        )
