from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.investment_advisor import prompts


class InvestmentAdvisorAgent(BaseAgent):
    agent_name = "investment_advisor"
    system_prompt = prompts.SYSTEM_PROMPT

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Review portfolio principles for this user.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.78}
