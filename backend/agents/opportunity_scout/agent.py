from typing import Any, Dict

from apps.opportunities.models import Opportunity
from apps.users.models import User
from agents.base_agent import BaseAgent
from agents.opportunity_scout import prompts


class OpportunityScoutAgent(BaseAgent):
    agent_name = "opportunity_scout"
    system_prompt = prompts.SYSTEM_PROMPT

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        q = (input_data.get("query") or "").strip()
        if q:
            summary = self.chat(q)
            return {"summary": summary, "data": {}, "confidence": 0.72}

        prompt = (
            "Propose one concrete, time-sensitive financial opportunity for this user "
            "in Nigeria today. Keep under 400 words. Include title line first line."
        )
        summary = self.chat(prompt)
        title = summary.split("\n", 1)[0].strip()[:300]
        user = User.objects.get(id=self.user_id)
        opp = Opportunity.objects.create(
            user=user,
            opp_type="investment",
            title=title or "Daily scout",
            description=summary[:4000],
            match_score=55.0,
            urgency_score=40.0,
        )
        return {"summary": summary, "data": {"opportunity_id": opp.id}, "confidence": 0.65, "saved": opp.id}
