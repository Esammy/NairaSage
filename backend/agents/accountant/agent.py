from typing import Any, Dict

from agents.accountant import prompts
from agents.accountant.skills import uncategorized_count
from agents.base_agent import BaseAgent


class AccountantAgent(BaseAgent):
    agent_name = "accountant"
    system_prompt = prompts.SYSTEM

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "").strip()
        if not q:
            n = uncategorized_count(self.user_id)
            q = f"You have {n} uncategorized transactions. Summarize spending focus areas."
        summary = self.chat(q)
        return {"summary": summary, "data": {"uncategorized": uncategorized_count(self.user_id)}, "confidence": 0.8}
