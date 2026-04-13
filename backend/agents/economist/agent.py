from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.context_data import build_macro_data
from agents.economist import prompts


class EconomistAgent(BaseAgent):
    agent_name = "economist"
    system_prompt = prompts.SYSTEM_PROMPT
    use_tier1_rag = True

    def _placeholder_context(self) -> dict[str, str]:
        ctx = super()._placeholder_context()
        ctx["MACRO_DATA"] = build_macro_data()
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Summarize current macro risks relevant to a Nigerian saver.").strip()
        summary = self.chat(q)
        return {"summary": summary, "data": {}, "confidence": 0.75}
