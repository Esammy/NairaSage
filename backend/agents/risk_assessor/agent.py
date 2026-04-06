from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.risk_assessor import prompts


class RiskAssessorAgent(BaseAgent):
    agent_name = "risk_assessor"
    system_prompt = prompts.SYSTEM

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Assess portfolio risk for this user at a high level.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.71}
