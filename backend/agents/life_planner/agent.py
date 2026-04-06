from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.life_planner import prompts


class LifePlannerAgent(BaseAgent):
    agent_name = "life_planner"
    system_prompt = prompts.SYSTEM

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Run a simple long-term savings scenario.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.72}
