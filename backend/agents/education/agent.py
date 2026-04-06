from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.education import prompts


class EducationAgent(BaseAgent):
    agent_name = "education"
    system_prompt = prompts.SYSTEM

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Explain compound interest simply.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.85}
