from __future__ import annotations

import logging
from typing import Any, Dict, List

from django.conf import settings

from agents.researcher import prompts

logger = logging.getLogger(__name__)


class ResearcherAgent:
    """
    Live web context via Tavily. Does not use the specialist LLM or BaseAgent memory.
    """

    agent_name = "researcher"
    system_prompt = prompts.SYSTEM_PROMPT

    def __init__(self, user_id: int, dna=None):
        self.user_id = user_id

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "").strip()
        if not q:
            return {
                "summary": "[researcher] No search query provided.",
                "data": {"sources": []},
                "confidence": 0.0,
            }

        key = (getattr(settings, "TAVILY_API_KEY", None) or "").strip()
        if not key:
            logger.warning("TAVILY_API_KEY missing; researcher returning empty context")
            return {
                "summary": (
                    "[researcher] Web search is not configured (missing TAVILY_API_KEY). "
                    "Proceed using Tier-2 data and general knowledge only."
                ),
                "data": {"sources": []},
                "confidence": 0.0,
            }

        try:
            from tavily import TavilyClient
        except ImportError:
            return {
                "summary": "[researcher] tavily-python is not installed.",
                "data": {"sources": []},
                "confidence": 0.0,
            }

        try:
            client = TavilyClient(api_key=key)
            resp = client.search(query=q, max_results=5, search_depth="basic")
        except Exception as e:  # noqa: BLE001
            logger.exception("Tavily search failed: %s", e)
            return {
                "summary": f"[researcher] Web search failed: {e!s}",
                "data": {"sources": []},
                "confidence": 0.0,
            }

        results = resp.get("results") if isinstance(resp, dict) else getattr(resp, "results", None)
        if not results:
            return {
                "summary": "[researcher] No web results returned for this query.",
                "data": {"sources": []},
                "confidence": 0.35,
            }

        sources: List[Dict[str, str]] = []
        lines: List[str] = ["[researcher] Recent web snippets (verify dates; not legal advice):"]
        for r in results[:5]:
            if not isinstance(r, dict):
                continue
            title = (r.get("title") or "").strip() or "Untitled"
            url = (r.get("url") or "").strip()
            body = (r.get("content") or r.get("snippet") or "").strip()
            if url:
                sources.append({"title": title, "url": url})
            excerpt = body[:900] + ("…" if len(body) > 900 else "")
            lines.append(f"- {title}\n  URL: {url}\n  {excerpt}")

        answer = resp.get("answer") if isinstance(resp, dict) else None
        if answer and str(answer).strip():
            lines.insert(1, f"Summary line (from search tool): {str(answer).strip()[:500]}")

        summary = "\n".join(lines)
        return {
            "summary": summary,
            "data": {"sources": sources},
            "confidence": 0.55,
        }
