from __future__ import annotations

import hashlib
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, Iterator, List, Optional, Tuple

from django.core.cache import cache
from django.db import close_old_connections
from django.utils import timezone
from langchain_core.messages import HumanMessage, SystemMessage

from apps.users.models import (
    CoordinatorChatSession,
    FinancialDNA,
    SkillOutcome,
    User,
)

from agents.coordinator_prompts import ROUTING_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT
from agents.prompt_utils import render_prompt
from agents.routing_heuristic import heuristic_route
from agents.telemetry import log_coordinator_turn
from core.dna_context import dna_context_for_prompt
from core.llm_factory import get_synthesis_llm
from core.stream_utils import stream_chunk_text
from core.utils import extract_json_object

logger = logging.getLogger(__name__)

AGENT_REGISTRY = {
    "accountant": "agents.accountant.agent.AccountantAgent",
    "researcher": "agents.researcher.agent.ResearcherAgent",
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

_ROUTE_CACHE_TTL = 3600
_ROUTE_CACHE_PREFIX = "coord_route:v1"


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


class CoordinatorAgent:
    def __init__(self, user_id: int):
        self.user_id = user_id
        from core.llm_factory import get_routing_llm

        self.router_llm = get_routing_llm()
        user = User.objects.get(id=user_id)
        self.dna, _ = FinancialDNA.objects.get_or_create(user=user)

    def _route_cache_key(self, message: str) -> str:
        norm = " ".join(message.strip().lower().split())
        digest = hashlib.sha256(norm.encode("utf-8")).hexdigest()[:24]
        return f"{_ROUTE_CACHE_PREFIX}:{self.user_id}:{digest}"

    def route(self, message: str) -> Dict[str, Any]:
        cache_key = self._route_cache_key(message)
        cached = cache.get(cache_key)
        if isinstance(cached, dict) and cached.get("agents"):
            decision = dict(cached)
            return self._apply_routing_weights(decision)

        decision = heuristic_route(message)
        if decision is None:
            try:
                response = self.router_llm.invoke(
                    [
                        SystemMessage(content=ROUTING_SYSTEM_PROMPT),
                        HumanMessage(content=message),
                    ]
                )
                raw = getattr(response, "content", str(response))
                try:
                    decision = json.loads(extract_json_object(raw))
                except json.JSONDecodeError:
                    logger.warning("Coordinator JSON parse failed: %s", raw[:200])
                    decision = {
                        "agents": ["accountant"],
                        "intent_bucket": "fallback",
                        "cross_domain": False,
                    }
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "Routing LLM failed (%s: %s); using heuristic or accountant fallback.",
                    type(e).__name__,
                    e,
                )
                decision = heuristic_route(message)
                if decision is None:
                    decision = {
                        "agents": ["accountant"],
                        "intent_bucket": "routing_unavailable",
                        "cross_domain": False,
                        "reasoning": "Routing model failed (network, provider block, or API error).",
                    }

        if "cross_domain" not in decision:
            decision["cross_domain"] = len(decision.get("agents", []) or []) > 1

        decision = self._apply_routing_weights(decision)
        cache.set(
            cache_key,
            {
                "agents": decision.get("agents", []),
                "intent_bucket": decision.get("intent_bucket", ""),
                "cross_domain": decision.get("cross_domain", False),
                "reasoning": (decision.get("reasoning") or "")[:500],
            },
            _ROUTE_CACHE_TTL,
        )
        return decision

    def _apply_routing_weights(self, decision: dict) -> dict:
        weights = self.dna.routing_weights or {}
        bucket = decision.get("intent_bucket", "")
        agents = list(decision.get("agents", []))
        if bucket in weights and isinstance(weights[bucket], dict):
            for agent, weight in weights[bucket].items():
                if weight > 0.8 and agent not in agents:
                    agents.append(agent)
        decision["agents"] = agents[:3]
        if "cross_domain" not in decision:
            decision["cross_domain"] = len(decision["agents"]) > 1
        return decision

    def _load_agent(self, agent_path: str, user_id: int, dna: FinancialDNA):
        module_path, class_name = agent_path.rsplit(".", 1)
        import importlib

        module = importlib.import_module(module_path)
        cls = getattr(module, class_name)
        try:
            return cls(user_id=user_id, dna=dna)
        except TypeError:
            return cls(user_id=user_id)

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
            agent = self._load_agent(path, self.user_id, self.dna)
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

    def _max_parallel_workers(self, num_agents: int, cross_domain: bool) -> int:
        cap = 3 if cross_domain else min(2, num_agents)
        return max(1, min(cap, num_agents))

    def _run_agents_parallel(
        self, agent_names: List[str], message: str, cross_domain: bool = False
    ) -> Dict[str, Any]:
        names = [n for n in agent_names if AGENT_REGISTRY.get(n)]
        if not names:
            names = ["accountant"]
        results: Dict[str, Any] = {}
        max_workers = self._max_parallel_workers(len(names), cross_domain)
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(self._run_single_agent, n, message): n for n in names
            }
            for fut in as_completed(futures):
                name, payload = fut.result()
                results[name] = payload
        return {n: results[n] for n in names if n in results}

    def _iter_parallel_agent_results(
        self,
        agent_names: List[str],
        message: str,
        cross_domain: bool,
    ) -> Iterator[Tuple[str, Dict[str, Any]]]:
        names = [n for n in agent_names if AGENT_REGISTRY.get(n)]
        if not names:
            names = ["accountant"]
        max_workers = self._max_parallel_workers(len(names), cross_domain)
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(self._run_single_agent, n, message): n for n in names
            }
            for fut in as_completed(futures):
                yield fut.result()

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
        return text

    def _session_for_user(self, session_id: Optional[int]) -> Optional[CoordinatorChatSession]:
        if not session_id:
            return None
        return CoordinatorChatSession.objects.filter(
            pk=session_id, user_id=self.user_id
        ).first()

    def _touch_session_after_outcome(
        self,
        session: Optional[CoordinatorChatSession],
        user_message: str,
    ) -> None:
        if session is None:
            return
        row = CoordinatorChatSession.objects.filter(
            pk=session.pk, user_id=self.user_id
        ).first()
        if not row:
            return
        now = timezone.now()
        payload: Dict[str, Any] = {"updated_at": now}
        if row.title == "New chat" and user_message.strip():
            payload["title"] = user_message.strip()[:120]
        CoordinatorChatSession.objects.filter(pk=session.pk, user_id=self.user_id).update(
            **payload
        )

    def _flag_skill_gap(self, query: str, bucket: str) -> None:
        from tasks.skill_gap_tasks import flag_skill_gap_report

        flag_skill_gap_report.delay(query, bucket)

    def dispatch(
        self, message: str, session_id: Optional[int] = None
    ) -> Dict[str, Any]:
        start = time.time()
        routing = self.route(message)
        agents = routing.get("agents", ["accountant"])[:3]
        bucket = routing.get("intent_bucket", "unknown")
        cross = bool(routing.get("cross_domain", False))
        log_coordinator_turn(
            phase="routing",
            user_id=self.user_id,
            intent_bucket=bucket,
            agents=agents,
        )

        session = self._session_for_user(session_id)
        if len(agents) == 1:
            name, payload = self._run_single_agent(agents[0], message)
            results = {name: payload}
            response_text = str(payload.get("summary", ""))
        else:
            results = self._run_agents_parallel(agents, message, cross_domain=cross)
            response_text = self._synthesize(message, results)
        elapsed = int((time.time() - start) * 1000)
        outcome = SkillOutcome.objects.create(
            user_id=self.user_id,
            session=session,
            intent_bucket=bucket,
            agents_called=agents,
            user_query=message[:500],
            assistant_response=response_text,
            response_time_ms=elapsed,
        )
        self._touch_session_after_outcome(session, message)

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
        log_coordinator_turn(
            phase="dispatch_done",
            user_id=self.user_id,
            intent_bucket=bucket,
            agents=agents,
            outcome_id=outcome.id,
            ms=elapsed,
            response_length=len(response_text),
        )
        return {
            "response": response_text,
            "agents_used": agents,
            "intent": bucket,
            "outcome_id": outcome.id,
        }

    def iter_sse(
        self, message: str, session_id: Optional[int] = None
    ) -> Iterator[str]:
        """Server-Sent Events: meta → status (optional) → delta (many) → done."""
        start = time.time()
        session = self._session_for_user(session_id)
        routing = self.route(message)
        agents = routing.get("agents", ["accountant"])[:3]
        bucket = routing.get("intent_bucket", "unknown")
        cross = bool(routing.get("cross_domain", False))
        log_coordinator_turn(
            phase="stream_routing",
            user_id=self.user_id,
            intent_bucket=bucket,
            agents=agents,
        )
        yield _sse(
            "meta",
            {"agents_used": agents, "intent": bucket},
        )

        pieces: List[str] = []
        results: Dict[str, Any] = {}

        if len(agents) == 1:
            name = agents[0]
            path = AGENT_REGISTRY.get(name)
            if path:
                agent = self._load_agent(path, self.user_id, self.dna)
                if name == "researcher":
                    payload = agent.run({"query": message})
                    summary = str(payload.get("summary", ""))
                    results[name] = payload
                    step = 160
                    for i in range(0, len(summary), step):
                        part = summary[i : i + step]
                        pieces.append(part)
                        yield _sse("delta", {"text": part})
                elif hasattr(agent, "stream_chat"):
                    for text in agent.stream_chat(message):
                        if text:
                            pieces.append(text)
                            yield _sse("delta", {"text": text})
                    full_single = "".join(pieces)
                    results[name] = {
                        "summary": full_single,
                        "data": {},
                        "confidence": 0.8,
                    }
                else:
                    n2, payload = self._run_single_agent(name, message)
                    results[n2] = payload
                    summary = str(payload.get("summary", ""))
                    step = 160
                    for i in range(0, len(summary), step):
                        part = summary[i : i + step]
                        pieces.append(part)
                        yield _sse("delta", {"text": part})
        else:
            for agent_name, payload in self._iter_parallel_agent_results(
                agents, message, cross_domain=cross
            ):
                results[agent_name] = payload
                yield _sse(
                    "status",
                    {"agent": agent_name, "phase": "ready"},
                )

            llm = get_synthesis_llm()
            messages = self._synthesis_messages(message, results)
            try:
                for chunk in llm.stream(messages):
                    text = stream_chunk_text(chunk)
                    if text:
                        pieces.append(text)
                        yield _sse("delta", {"text": text})
            except Exception as e:  # noqa: BLE001
                logger.exception("Synthesis stream failed: %s", e)
                err = "I could not complete the response. Please try again."
                pieces.append(err)
                yield _sse("delta", {"text": err})

        full_response = "".join(pieces)

        elapsed = int((time.time() - start) * 1000)
        outcome = SkillOutcome.objects.create(
            user_id=self.user_id,
            session=session,
            intent_bucket=bucket,
            agents_called=agents,
            user_query=message[:500],
            assistant_response=full_response,
            response_time_ms=elapsed,
        )
        self._touch_session_after_outcome(session, message)

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
        log_coordinator_turn(
            phase="stream_done",
            user_id=self.user_id,
            intent_bucket=bucket,
            agents=agents,
            outcome_id=outcome.id,
            ms=elapsed,
            response_length=len(full_response),
        )
        yield _sse(
            "done",
            {"outcome_id": outcome.id, "response_length": len(full_response)},
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
