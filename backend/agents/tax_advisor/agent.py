from typing import Any, Dict

from agents.base_agent import BaseAgent
from agents.context_data import build_tax_data
from agents.tax_advisor import prompts
from agents.tax_advisor.skills import paye_nigeria


class TaxAdvisorAgent(BaseAgent):
    agent_name = "tax_advisor"
    system_prompt = prompts.SYSTEM_PROMPT

    def _placeholder_context(self) -> dict[str, str]:
        ctx = super()._placeholder_context()
        ctx["TAX_DATA"] = build_tax_data(self.user_id, self.dna)
        return ctx

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "Explain PAYE basics for a salaried Lagos worker.").strip()
        summary = self.chat(q)
        data = {}
        inc = self.dna.monthly_income
        if inc:
            annual = float(inc) * 12
            data["paye_estimate"] = paye_nigeria(annual)
        return {"summary": summary, "data": data, "confidence": 0.7}
