from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, Iterator, List, Tuple

from django.db import close_old_connections
from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage

from apps.users.models import FinancialDNA, SkillGapReport, SkillOutcome, User

from agents.coordinator_prompts import ROUTING_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT
from agents.disclaimer import LEGAL_DISCLAIMER
from agents.prompt_utils import render_prompt
from core.dna_context import dna_context_for_prompt
from core.llm_factory import get_llm, get_routing_llm, get_synthesis_llm
from core.utils import extract_json_object

logger = logging.getLogger(__name__)

AGENT_REGISTRY = {
    "accountant": "agents.accountant.agent.AccountantAgent",
    "economist": "agents.economist.agent.EconomistAgent",
    "investment_advisor": "agents.investment_advisor.agent.InvestmentAdvisorAgent",
    "opportunity_scout": "agents.opportunity_scout.agent.OpportunityScoutAgent",
    "tax_advisor": "agents.tax_advisor.agent.TaxAdvisorAgent",
    "behavioral_coach": "agents.behavioral_coach.agent.BehavioralCoachAgent",
    "debt_manager": "agents.debt_manager.agent.DebtManagerAgent",
    "savings_optimizer": "agents.savings_optimizer.agent.SavingsOptimizerAgent",
    "risk_assessor": "agents.risk_assessor.agent.RiskAssessorAgent",
    "life_planner": "agents.life_planner.agent.LifePlannerAgent",
    "education": "agents.education.agent.EducationAgent",
}


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _stream_chunk_text(chunk: Any) -> str:
    if chunk is None:
        return ""
    if isinstance(chunk, AIMessageChunk):
        c = chunk.content
    elif hasattr(chunk, "content"):
        c = getattr(chunk, "content", "")
    else:
        return str(chunk) if chunk else ""
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        parts = []
        for item in c:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts)
    return str(c) if c else ""


class CoordinatorAgent:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.router_llm = get_routing_llm()
        user = User.objects.get(id=user_id)
        self.dna, _ = FinancialDNA.objects.get_or_create(user=user)

    def route(self, message: str) -> Dict[str, Any]:
        response = self.router_llm.invoke(
            [
                SystemMessage(content=ROUTING_SYSTEM_PROMPT),
                HumanMessage(content=message),
            ]
        )
        raw = getattr(response, "content", str(response))
        try:
            decision = json.loads(extract_json_object(raw))
            decision = self._apply_routing_weights(decision)
            return decision
        except json.JSONDecodeError:
            logger.warning("Coordinator JSON parse failed: %s", raw[:200])
            return {"agents": ["accountant"], "intent_bucket": "fallback"}

    def _apply_routing_weights(self, decision: dict) -> dict:
        weights = self.dna.routing_weights or {}
        bucket = decision.get("intent_bucket", "")
        agents = list(decision.get("agents", []))
        if bucket in weights and isinstance(weights[bucket], dict):
            for agent, weight in weights[bucket].items():
                if weight > 0.8 and agent not in agents:
                    agents.append(agent)
        decision["agents"] = agents[:3]
        return decision

    def _load_agent(self, agent_path: str, user_id: int):
        module_path, class_name = agent_path.rsplit(".", 1)
        import importlib

        module = importlib.import_module(module_path)
        return getattr(module, class_name)(user_id=user_id)

    def _run_single_agent(self, name: str, message: str) -> Tuple[str, Dict[str, Any]]:
        close_old_connections()
        try:
            path = AGENT_REGISTRY.get(name)
            if not path:
                return name, {
                    "summary": f"[{name} unknown]",
                    "data": {},
                    "confidence": 0.0,
                }
            agent = self._load_agent(path, self.user_id)
            return name, agent.run({"query": message})
        except Exception as e:  # noqa: BLE001
            logger.exception("Agent %s failed: %s", name, e)
            return name, {
                "summary": f"[{name} unavailable]",
                "data": {},
                "confidence": 0.0,
            }
        finally:
            close_old_connections()

    def _run_agents_parallel(self, agent_names: List[str], message: str) -> Dict[str, Any]:
        names = [n for n in agent_names if AGENT_REGISTRY.get(n)]
        if not names:
            names = ["accountant"]
        results: Dict[str, Any] = {}
        max_workers = min(3, len(names))
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(self._run_single_agent, n, message): n for n in names
            }
            for fut in as_completed(futures):
                name, payload = fut.result()
                results[name] = payload
        return {n: results[n] for n in names if n in results}

    def _synthesis_messages(self, query: str, results: dict):
        context = "\n\n".join(
            f"[{name} report]: {r.get('summary', '')}" for name, r in results.items()
        )
        literacy = self.dna.financial_literacy_score
        system_text = render_prompt(
            SYNTHESIS_SYSTEM_PROMPT,
            {"DNA_CONTEXT": dna_context_for_prompt(self.dna)},
        )
        return [
            SystemMessage(content=system_text),
            HumanMessage(
                content=(
                    f"User financial literacy score (0-100): {literacy}\n\n"
                    f"User asked: {query}\n\nAgent reports:\n{context}"
                )
            ),
        ]

    def _synthesize(self, query: str, results: dict) -> str:
        llm = get_synthesis_llm()
        response = llm.invoke(self._synthesis_messages(query, results))
        text = getattr(response, "content", str(response))
        return text + LEGAL_DISCLAIMER

    def dispatch(self, message: str) -> Dict[str, Any]:
        start = time.time()
        routing = self.route(message)
        agents = routing.get("agents", ["accountant"])[:3]
        bucket = routing.get("intent_bucket", "unknown")

        results = self._run_agents_parallel(agents, message)
        response_text = self._synthesize(message, results)
        elapsed = int((time.time() - start) * 1000)
        outcome = SkillOutcome.objects.create(
            user_id=self.user_id,
            intent_bucket=bucket,
            agents_called=agents,
            user_query=message[:500],
            assistant_response=response_text,
            response_time_ms=elapsed,
        )

        if not results or all(
            "[unavailable]" in str(r.get("summary", "")) for r in results.values()
        ):
            self._flag_skill_gap(message, bucket)

        logger.info(
            "coordinator_dispatch user=%s intent=%s agents=%s outcome_id=%s ms=%s",
            self.user_id,
            bucket,
            agents,
            outcome.id,
            elapsed,
        )
        return {
            "response": response_text,
            "agents_used": agents,
            "intent": bucket,
            "outcome_id": outcome.id,
        }

    def iter_sse(self, message: str) -> Iterator[str]:
        """Server-Sent Events: meta → delta (many) → done."""
        start = time.time()
        routing = self.route(message)
        agents = routing.get("agents", ["accountant"])[:3]
        bucket = routing.get("intent_bucket", "unknown")
        yield _sse(
            "meta",
            {"agents_used": agents, "intent": bucket},
        )

        results = self._run_agents_parallel(agents, message)

        llm = get_synthesis_llm()
        messages = self._synthesis_messages(message, results)
        pieces: List[str] = []
        try:
            for chunk in llm.stream(messages):
                text = _stream_chunk_text(chunk)
                if text:
                    pieces.append(text)
                    yield _sse("delta", {"text": text})
        except Exception as e:  # noqa: BLE001
            logger.exception("Synthesis stream failed: %s", e)
            err = "I could not complete the response. Please try again."
            pieces.append(err)
            yield _sse("delta", {"text": err})

        yield _sse("delta", {"text": LEGAL_DISCLAIMER})
        full_response = "".join(pieces) + LEGAL_DISCLAIMER

        elapsed = int((time.time() - start) * 1000)
        outcome = SkillOutcome.objects.create(
            user_id=self.user_id,
            intent_bucket=bucket,
            agents_called=agents,
            user_query=message[:500],
            assistant_response=full_response,
            response_time_ms=elapsed,
        )

        if not results or all(
            "[unavailable]" in str(r.get("summary", "")) for r in results.values()
        ):
            self._flag_skill_gap(message, bucket)

        logger.info(
            "coordinator_stream_done user=%s intent=%s agents=%s outcome_id=%s ms=%s",
            self.user_id,
            bucket,
            agents,
            outcome.id,
            elapsed,
        )
        yield _sse(
            "done",
            {"outcome_id": outcome.id, "response_length": len(full_response)},
        )

    def _flag_skill_gap(self, query: str, bucket: str):
        existing = SkillGapReport.objects.filter(
            query_pattern__icontains=bucket[:50], status="pending"
        ).first()
        if existing:
            existing.frequency += 1
            existing.save(update_fields=["frequency"])
            return
        gap_llm = get_llm(temperature=0.2, max_tokens=512)
        spec_response = gap_llm.invoke(
            [
                SystemMessage(
                    content=(
                        "Write a brief technical spec for a new NairaSage agent skill "
                        "that would handle this type of user query. Under 200 words."
                    )
                ),
                HumanMessage(content=f"Query: {query}\nBucket: {bucket}"),
            ]
        )
        SkillGapReport.objects.create(
            query_pattern=query[:300],
            proposed_spec=getattr(spec_response, "content", str(spec_response)),
        )

    def record_feedback(self, outcome_id: int, was_helpful: bool) -> bool:
        updated = SkillOutcome.objects.filter(
            id=outcome_id, user_id=self.user_id
        ).update(was_helpful=was_helpful)
        if not updated:
            return False
        from tasks.scout_tasks import update_routing_weights

        update_routing_weights.delay(self.user_id)
        return True
