"""Deal deep-analysis with a Qwen thinking model (visible reasoning).

Streams qwen3-max-thinking over a deal + the user's financial DNA + Kiyosaki
corpus context. The model's chain-of-thought arrives as
chunk.additional_kwargs["reasoning_content"] and is forwarded as `reasoning`
SSE events so the user watches the analysis happen; the final verdict streams
as `delta` events and ends with a structured `scores` event covering the
10 Investor Controls.

SSE protocol: meta -> reasoning (many) -> delta (many) -> scores -> done.
"""

from __future__ import annotations

import json
import logging
from typing import Iterator

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.renderers import EventStreamRenderer
from apps.wealth.models import Deal, InvestorControlsChecklist
from core.dna_context import dna_context_for_prompt
from core.qwen_stream import stream_thinking
from core.utils import extract_json_object

logger = logging.getLogger(__name__)

CONTROL_KEYS = [
    "control_1_self",
    "control_2_ratios",
    "control_3_management",
    "control_4_taxes",
    "control_5_entry_exit",
    "control_6_brokerage",
    "control_7_etc_opm",
    "control_8_terms",
    "control_9_info_access",
    "control_10_philanthropy",
]

SYSTEM_PROMPT = """You are NairaSage's senior deal analyst for Nigerian investors.
Analyze the deal through Robert Kiyosaki's 10 Investor Controls, grounded in
Nigerian market reality (Naira inflation, NGX, CBN policy, FIRS taxes).

Think through each control carefully, then give a verdict the user can act on.

End your answer with EXACTLY one JSON object in a ```json fence shaped as:
{
  "scores": {"control_1_self": 0-3, ..., "control_10_philanthropy": 0-3},
  "verdict": "pursue" | "renegotiate" | "pass",
  "headline": "<one-sentence verdict>"
}
Score 0=not addressed, 1=weak, 2=adequate, 3=strong."""


def _deal_brief(deal: Deal) -> str:
    controls = InvestorControlsChecklist.objects.filter(deal=deal).first()
    lines = [
        f"Title: {deal.title}",
        f"Type: {deal.get_deal_type_display()} | Status: {deal.get_status_display()}",
        f"Entry price: NGN {deal.entry_price}",
        f"Projected monthly cashflow: NGN {deal.projected_monthly_cashflow}",
        f"Projected ROI %: {deal.projected_roi_pct if deal.projected_roi_pct is not None else 'n/a'}",
        f"Notes: {deal.notes or '(none)'}",
    ]
    if controls:
        current = {k: getattr(controls, k) for k in CONTROL_KEYS}
        lines.append(f"User's current self-ratings (0-3): {json.dumps(current)}")
    return "\n".join(lines)


def _rag_context(deal: Deal) -> str:
    try:
        from apps.knowledge.retrieval import retrieve_knowledge_context

        return retrieve_knowledge_context(
            f"10 investor controls evaluating a {deal.get_deal_type_display()} deal",
            agent_name="rich_dad_coach",
            k=3,
        )
    except Exception as e:  # noqa: BLE001 - RAG is optional context, never fatal
        logger.warning("Deal analysis RAG unavailable: %s", e)
        return ""


def iter_deal_analysis_sse(user, deal: Deal) -> Iterator[str]:
    def _sse(event: str, payload: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

    yield _sse("meta", {"deal_id": deal.id, "title": deal.title, "mode": "deep_analysis"})

    dna_block = ""
    try:
        dna = getattr(user, "financial_dna", None)
        if dna is not None:
            dna_block = dna_context_for_prompt(dna)
    except Exception as e:  # noqa: BLE001
        logger.warning("Deal analysis DNA context unavailable: %s", e)

    user_content = (
        f"Investor profile:\n{dna_block or '(no profile data)'}\n\n"
        f"Deal under evaluation:\n{_deal_brief(deal)}"
    )
    rag = _rag_context(deal)
    if rag:
        user_content += f"\n\nRelevant book passages:\n{rag}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    answer_parts: list[str] = []
    try:
        for channel, text in stream_thinking(messages):
            if channel == "reasoning":
                yield _sse("reasoning", {"text": text})
            else:
                answer_parts.append(text)
                yield _sse("delta", {"text": text})
    except Exception as e:  # noqa: BLE001
        logger.exception("Deal deep-analysis stream failed: %s", e)
        yield _sse("delta", {"text": "Analysis could not be completed. Please try again."})

    full = "".join(answer_parts)
    try:
        parsed = json.loads(extract_json_object(full))
        scores = parsed.get("scores") or {}
        clean = {k: int(scores[k]) for k in CONTROL_KEYS if k in scores}
        yield _sse(
            "scores",
            {
                "scores": clean,
                "verdict": str(parsed.get("verdict", "")),
                "headline": str(parsed.get("headline", "")),
            },
        )
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        logger.warning("Deal analysis scores parse failed: %s", e)

    yield _sse("done", {"response_length": len(full)})


class DealDeepAnalysisView(APIView):
    """POST /api/wealth/deals/<deal_id>/deep-analysis/ -> SSE stream."""

    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer, EventStreamRenderer]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request, deal_id: int):
        deal = get_object_or_404(Deal, pk=deal_id, user=request.user)
        resp = StreamingHttpResponse(
            iter_deal_analysis_sse(request.user, deal),
            content_type="text/event-stream; charset=utf-8",
        )
        resp["Cache-Control"] = "no-cache, no-transform"
        resp["X-Accel-Buffering"] = "no"
        return resp
