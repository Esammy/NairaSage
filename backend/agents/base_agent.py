from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from agents.prompt_utils import render_prompt
from apps.users.models import FinancialDNA, User
from core.dna_context import dna_context_for_prompt
from core.llm_factory import get_llm
from core.stream_utils import stream_chunk_text

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    agent_name: str = "base"
    system_prompt: str = ""
    _max_turns: int = 6
    #: When True, inject Tier-1 book RAG into `{RAG_CONTEXT}` / `{TIER_SEPARATION_RULES}` placeholders.
    use_tier1_rag: bool = False

    def __init__(self, user_id: int, dna: FinancialDNA | None = None):
        self.user_id = user_id
        self.llm = get_llm()
        if dna is not None:
            self.dna = dna
        else:
            try:
                self.dna = FinancialDNA.objects.select_related("user").get(user_id=user_id)
            except FinancialDNA.DoesNotExist:
                user = User.objects.get(id=user_id)
                self.dna = FinancialDNA.objects.create(user=user)

    def _stored_messages(self) -> List[Dict[str, str]]:
        block = self.dna.agent_memory.get(self.agent_name, {})
        return list(block.get("messages", []))

    def _persist_messages(self, messages: List[Dict[str, str]]) -> None:
        full = dict(self.dna.agent_memory)
        block = dict(full.get(self.agent_name, {}))
        block["messages"] = messages[-24:]
        block["updated"] = datetime.utcnow().isoformat()
        full[self.agent_name] = block
        self.dna.agent_memory = full
        self.dna.save(update_fields=["agent_memory", "updated_at"])

    def _placeholder_context(self) -> Dict[str, str]:
        """Override in subclasses to inject domain blocks (transactions, portfolio, etc.)."""
        ctx: Dict[str, str] = {"DNA_CONTEXT": dna_context_for_prompt(self.dna)}
        if self.use_tier1_rag:
            from agents.rag_prompts import TIER_SEPARATION_RULES
            from apps.knowledge.retrieval import retrieve_knowledge_context

            ctx["TIER_SEPARATION_RULES"] = TIER_SEPARATION_RULES
            q = getattr(self, "_pending_user_message", "") or ""
            try:
                ctx["RAG_CONTEXT"] = retrieve_knowledge_context(
                    q, self.agent_name, k=4
                )
            except Exception as e:  # noqa: BLE001
                logger.exception("Tier-1 retrieval failed: %s", e)
                ctx["RAG_CONTEXT"] = (
                    "(Book retrieval is temporarily unavailable; proceed without quoted passages.)"
                )
        return ctx

    def _render_system_content(self) -> str:
        return render_prompt(self.system_prompt, self._placeholder_context())

    def chat(self, user_input: str) -> str:
        self._pending_user_message = user_input
        stored = self._stored_messages()
        history: List = []
        for m in stored[-self._max_turns :]:
            if m.get("role") == "user":
                history.append(HumanMessage(content=m["content"]))
            else:
                history.append(AIMessage(content=m["content"]))
        messages = [
            SystemMessage(content=self._render_system_content()),
            *history,
            HumanMessage(content=user_input),
        ]
        try:
            response = self.llm.invoke(messages)
            content = getattr(response, "content", str(response))
            stored.append({"role": "user", "content": user_input})
            stored.append({"role": "assistant", "content": content})
            self._persist_messages(stored)
            return content
        except Exception as e:  # noqa: BLE001
            logger.exception("%s error: %s", self.agent_name, e)
            return "I encountered an error processing your request. Please try again."

    def stream_chat(self, user_input: str):
        """Yield text chunks from the LLM; persists the full turn like chat()."""
        self._pending_user_message = user_input
        stored = self._stored_messages()
        history: List = []
        for m in stored[-self._max_turns :]:
            if m.get("role") == "user":
                history.append(HumanMessage(content=m["content"]))
            else:
                history.append(AIMessage(content=m["content"]))
        messages = [
            SystemMessage(content=self._render_system_content()),
            *history,
            HumanMessage(content=user_input),
        ]
        pieces: List[str] = []
        try:
            for chunk in self.llm.stream(messages):
                text = stream_chunk_text(chunk)
                if text:
                    pieces.append(text)
                    yield text
            content = "".join(pieces)
            stored.append({"role": "user", "content": user_input})
            stored.append({"role": "assistant", "content": content})
            self._persist_messages(stored)
        except Exception as e:  # noqa: BLE001
            logger.exception("%s stream error: %s", self.agent_name, e)
            err = "I encountered an error processing your request. Please try again."
            yield err

    @abstractmethod
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return {'summary': str, 'data': dict, 'confidence': float}."""
        raise NotImplementedError
