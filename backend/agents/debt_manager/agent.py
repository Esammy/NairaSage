from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.context_data import build_debt_data
from agents.debt_manager import prompts


class DebtManagerAgent(BaseAgent):
    agent_name = "debt_manager"
    system_prompt = prompts.SYSTEM_PROMPT

    def _placeholder_context(self) -> dict[str, str]:
        ctx = super()._placeholder_context()
        ctx["DEBT_DATA"] = build_debt_data(self.user_id)
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Outline a debt payoff strategy for this user.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.76}
