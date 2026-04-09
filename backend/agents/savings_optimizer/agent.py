from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.context_data import build_goals_data
from agents.savings_optimizer import prompts


class SavingsOptimizerAgent(BaseAgent):
    agent_name = "savings_optimizer"
    system_prompt = prompts.SYSTEM_PROMPT

    def _placeholder_context(self) -> dict[str, str]:
        ctx = super()._placeholder_context()
        ctx["GOALS_DATA"] = build_goals_data(self.user_id)
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Suggest savings allocation for the next 12 months.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.73}
