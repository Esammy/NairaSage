"""Rich Dad Coach specialist agent (internal key: rich_dad_coach).

User-facing name: NairaSage Coach. Supports tool calls with confirm-before-write
for streaming chat when the coordinator routes through the coach path.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Dict, Iterator, List, Optional

from django.contrib.auth import get_user_model
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from agents.base_agent import BaseAgent
from agents.prompt_utils import render_prompt
from agents.rag_prompts import TIER_SEPARATION_RULES
from agents.rich_dad_coach import prompts
from agents.rich_dad_coach.feature_guide import feature_guide_json_compact
from agents.rich_dad_coach.memory import extract_and_store, format_memories, top_memories
from agents.rich_dad_coach.skills import build_rich_dad_context, rich_dad_state_dict
from apps.wealth.actions import (
    WRITE_TOOL_NAMES,
    build_wealth_coach_tools,
    create_proposal,
    execute_read_tool,
)
from core.llm_factory import get_coach_fallback_models, get_coach_llm

logger = logging.getLogger(__name__)


def _normalize_message_content(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts)
    return str(content)


class RichDadCoachAgent(BaseAgent):
    agent_name = "rich_dad_coach"
    system_prompt = prompts.SYSTEM_PROMPT
    use_tier1_rag = True

    def __init__(self, user_id: int):
        super().__init__(user_id)
        # The coach drives the tool-calling loop; give it the flagship tier
        # (QWEN_COACH_MODEL, default qwen3-max) instead of the specialist model.
        self.llm = get_coach_llm()

    def _placeholder_context(self) -> Dict[str, str]:
        ctx = super()._placeholder_context()
        ctx["RICH_DAD_CONTEXT"] = build_rich_dad_context(self.user_id)
        ctx["FEATURE_GUIDE"] = feature_guide_json_compact()
        try:
            mem = top_memories(self.user_id, k=8)
            ctx["USER_MEMORY"] = format_memories(mem)
        except Exception as e:  # noqa: BLE001
            logger.warning("top_memories failed: %s", e)
            ctx["USER_MEMORY"] = "(Memory unavailable.)"
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "").strip()
        if not q:
            q = (
                "Diagnose my current Kiyosaki Investor Level and Phase and "
                "give me the single best action for the next 7 days."
            )
        summary = self.chat(q)
        return {
            "summary": summary,
            "data": rich_dad_state_dict(self.user_id),
            "confidence": 0.85,
        }

    def iter_sse_turn(
        self,
        user_input: str,
        session_id: Optional[int],
        text_accum: List[str],
        emit: Callable[[str, dict], str],
    ) -> Iterator[str]:
        """Run one coach turn with tools; yields ready-made SSE lines via emit(event, payload)."""
        self._pending_user_message = user_input
        user = get_user_model().objects.get(pk=self.user_id)
        stored = self._stored_messages()
        history_messages: List = []
        for m in stored[-self._max_turns :]:
            if m.get("role") == "user":
                history_messages.append(HumanMessage(content=m["content"]))
            else:
                history_messages.append(AIMessage(content=m["content"]))

        messages: List = [
            SystemMessage(content=self._render_system_content()),
            *history_messages,
            HumanMessage(content=user_input),
        ]

        tools = build_wealth_coach_tools()
        llm_tools = self.llm.bind_tools(tools)
        # Backup models (default qwen-flash) so a qwen3-max quota/rate-limit rejection
        # falls through instead of breaking the coach turn. Wrapped after bind_tools.
        _coach_backups = get_coach_fallback_models()
        if _coach_backups:
            llm_tools = llm_tools.with_fallbacks(
                [b.bind_tools(tools) for b in _coach_backups]
            )

        full_reply_parts: List[str] = []
        rounds = 0
        try:
            while rounds < 10:
                rounds += 1
                ai = llm_tools.invoke(messages)
                if not isinstance(ai, AIMessage):
                    messages.append(ai)
                    continue

                tcalls = list(getattr(ai, "tool_calls", None) or [])
                text_piece = _normalize_message_content(getattr(ai, "content", ""))
                if text_piece:
                    full_reply_parts.append(text_piece)
                    text_accum.append(text_piece)
                    for token in re.split(r"(\s+)", text_piece):
                        if token:
                            yield emit("delta", {"text": token})

                if not tcalls:
                    break

                messages.append(ai)
                for tc in tcalls:
                    name = tc.get("name") or ""
                    tid = tc.get("id") or ""
                    args = tc.get("args") or {}
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except json.JSONDecodeError:
                            args = {}
                    if not isinstance(args, dict):
                        args = {}

                    yield emit(
                        "tool_call",
                        {"name": name, "kind": "write" if name in WRITE_TOOL_NAMES else "read"},
                    )

                    if name in WRITE_TOOL_NAMES:
                        try:
                            prop = create_proposal(
                                user, name, args, session_id=session_id
                            )
                            yield emit(
                                "action_proposal",
                                {
                                    "id": prop.id,
                                    "tool": prop.tool,
                                    "args": prop.args,
                                    "human_summary": prop.human_summary,
                                    "diff_preview": prop.diff_preview,
                                },
                            )
                            payload = json.dumps(
                                {
                                    "status": "pending_confirmation",
                                    "proposal_id": prop.id,
                                    "message": (
                                        "Proposal created. The user must tap Confirm "
                                        "in the chat action card before data changes."
                                    ),
                                }
                            )
                        except Exception as e:  # noqa: BLE001
                            logger.exception("create_proposal failed")
                            payload = json.dumps(
                                {"error": str(e)[:500], "tool": name}
                            )
                    else:
                        try:
                            payload = execute_read_tool(user, name, args)
                        except Exception as e:  # noqa: BLE001
                            logger.exception("read tool failed")
                            payload = json.dumps({"error": str(e)[:500], "tool": name})

                    messages.append(
                        ToolMessage(content=payload, tool_call_id=tid or name)
                    )

            full_text = "".join(full_reply_parts).strip()
            if not full_text:
                full_text = (
                    "I prepared the requested lookups or proposals. "
                    "Confirm any pending changes in the action cards below."
                )
                text_accum.append(full_text)
                for token in re.split(r"(\s+)", full_text):
                    if token:
                        yield emit("delta", {"text": token})

            stored.append({"role": "user", "content": user_input})
            stored.append({"role": "assistant", "content": full_text})
            self._persist_messages(stored)

            try:
                extract_and_store(self.user_id, user_input, full_text)
            except Exception as e:  # noqa: BLE001
                logger.warning("extract_and_store failed: %s", e)

        except Exception as e:  # noqa: BLE001
            logger.exception("Coach stream turn failed: %s", e)
            err = "I could not complete that turn. Please try again."
            text_accum.append(err)
            yield emit("delta", {"text": err})


def reframe_reply(user_id: int, specialist_reply: str) -> str:
    """Run a short coaching reframe on top of a specialist reply."""

    from core.llm_factory import get_synthesis_llm

    reply = (specialist_reply or "").strip()
    if not reply:
        return reply

    try:
        rich_ctx = build_rich_dad_context(user_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to build rich-dad context: %s", e)
        return specialist_reply

    try:
        system = render_prompt(
            prompts.REFRAMER_SYSTEM_PROMPT,
            {
                "RICH_DAD_CONTEXT": rich_ctx,
                "TIER_SEPARATION_RULES": TIER_SEPARATION_RULES,
            },
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Reframer prompt render failed: %s", e)
        return specialist_reply

    try:
        llm = get_synthesis_llm()
        messages = [
            SystemMessage(content=system),
            HumanMessage(
                content=(
                    "Specialist reply to reframe (do not repeat, ADD a coaching "
                    "paragraph at the end):\n---\n" + reply
                )
            ),
        ]
        response = llm.invoke(messages)
        addition = getattr(response, "content", "") or ""
        addition = _normalize_message_content(addition).strip()
        if not addition:
            return specialist_reply
        return reply + "\n\n---\n**NairaSage Coach:**\n" + addition
    except Exception as e:  # noqa: BLE001
        logger.exception("Reframer LLM call failed: %s", e)
        return specialist_reply


def run_onboarding_assessment(
    user_id: int, answers: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Turn Wealth Discovery answers into a seeding dict."""

    import json

    from core.llm_factory import get_synthesis_llm
    from core.utils import extract_json_object

    try:
        system = prompts.ONBOARDING_SYSTEM_PROMPT
        llm = get_synthesis_llm()
        response = llm.invoke(
            [
                SystemMessage(content=system),
                HumanMessage(
                    content="Wealth Discovery answers:\n"
                    + "\n".join(f"{k}: {v}" for k, v in (answers or {}).items())
                ),
            ]
        )
        raw = getattr(response, "content", "") or ""
        obj = json.loads(extract_json_object(raw))
        if isinstance(obj, dict) and obj.get("primary_motivation"):
            return obj
    except Exception as e:  # noqa: BLE001
        logger.exception("Onboarding assessment LLM failed: %s", e)

    return _heuristic_onboarding(answers)


def _heuristic_onboarding(answers: Dict[str, Any]) -> Dict[str, Any]:
    """Offline fallback: simple scoring from the onboarding form."""
    motivation = (answers or {}).get("motivation") or "security"
    quadrant = (answers or {}).get("quadrant") or "E"
    has_debt = bool((answers or {}).get("has_bad_debt"))
    has_cashflow_assets = bool((answers or {}).get("has_cashflow_assets"))
    owns_business = bool((answers or {}).get("owns_business"))
    level = 0
    if has_cashflow_assets and owns_business:
        level = 4
    elif has_cashflow_assets:
        level = 3
    elif not has_debt:
        level = 2
    else:
        level = 1

    phase = 1
    if motivation == "wealthy":
        phase = 2
    if owns_business:
        phase = 3

    return {
        "primary_motivation": motivation,
        "quadrant_anchor": quadrant[:1].upper(),
        "phase_anchor": phase,
        "initial_level": level,
        "quadrant_split": {
            "E": 100.0 if quadrant == "E" else 20.0,
            "S": 100.0 if quadrant == "S" else 20.0,
            "B": 100.0 if quadrant == "B" else 20.0,
            "I": 100.0 if quadrant == "I" else 20.0,
            "target_B": 40.0,
            "target_I": 40.0,
        },
        "diagnosis": (
            "Heuristic fallback used - no LLM. Reassessment after you log your "
            "first financial statement will refine this."
        ),
    }
