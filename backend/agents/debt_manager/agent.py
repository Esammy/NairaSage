from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.debt_manager import prompts


class DebtManagerAgent(BaseAgent):
    agent_name = "debt_manager"
    system_prompt = prompts.SYSTEM

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Outline a debt payoff strategy for this user.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.76}
