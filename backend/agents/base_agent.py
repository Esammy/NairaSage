from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from apps.users.models import FinancialDNA, User
from core.llm_factory import get_llm

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "\n\n---\n"
    "Note: This is financial information provided for educational purposes. "
    "It is not licensed financial advice. Please consult a qualified financial "
    "advisor before making investment or financial decisions."
)


class BaseAgent(ABC):
    agent_name: str = "base"
    system_prompt: str = ""
    add_disclaimer: bool = True
    _max_turns: int = 12

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.llm = get_llm()
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

    def _get_dna_context(self) -> str:
        inc = self.dna.monthly_income
        return (
            f"USER PROFILE:\n"
            f"- Monthly income: NGN {inc if inc is not None else 'unknown'}\n"
            f"- Risk tolerance: {self.dna.risk_tolerance}\n"
            f"- Primary goal: {self.dna.primary_goal}\n"
            f"- Life stage: {self.dna.life_stage}\n"
            f"- Financial literacy: {self.dna.financial_literacy_score}/100\n"
            f"- Occupation: {self.dna.occupation}\n"
        )

    def chat(self, user_input: str) -> str:
        stored = self._stored_messages()
        history: List = []
        for m in stored[-self._max_turns :]:
            if m.get("role") == "user":
                history.append(HumanMessage(content=m["content"]))
            else:
                history.append(AIMessage(content=m["content"]))
        messages = [
            SystemMessage(content=self.system_prompt + "\n\n" + self._get_dna_context()),
            *history,
            HumanMessage(content=user_input),
        ]
        try:
            response = self.llm.invoke(messages)
            content = getattr(response, "content", str(response))
            if self.add_disclaimer:
                content += DISCLAIMER
            stored.append({"role": "user", "content": user_input})
            stored.append({"role": "assistant", "content": content})
            self._persist_messages(stored)
            return content
        except Exception as e:  # noqa: BLE001
            logger.exception("%s error: %s", self.agent_name, e)
            return "I encountered an error processing your request. Please try again."

    @abstractmethod
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return {'summary': str, 'data': dict, 'confidence': float}."""
        raise NotImplementedError
