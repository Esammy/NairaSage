from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.behavioral_coach import prompts
from agents.context_data import build_behavioral_data


class BehavioralCoachAgent(BaseAgent):
    agent_name = "behavioral_coach"
    system_prompt = prompts.SYSTEM_PROMPT

    def _placeholder_context(self) -> dict[str, str]:
        ctx = super()._placeholder_context()
        ctx["BEHAVIORAL_DATA"] = build_behavioral_data(self.dna)
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Give one habit nudge based on this user's profile.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.74}
