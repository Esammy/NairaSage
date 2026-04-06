from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.behavioral_coach import prompts


class BehavioralCoachAgent(BaseAgent):
    agent_name = "behavioral_coach"
    system_prompt = prompts.SYSTEM

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Give one habit nudge based on this user's profile.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.74}
