from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.context_data import build_education_extras
from agents.education import prompts


class EducationAgent(BaseAgent):
    agent_name = "education"
    system_prompt = prompts.SYSTEM_PROMPT

    def _placeholder_context(self) -> dict[str, str]:
        ctx = super()._placeholder_context()
        ctx.update(build_education_extras(self.dna))
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Explain compound interest simply.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.85}
