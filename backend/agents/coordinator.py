from __future__ import annotations

import hashlib
import json
import logging
import queue
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, Iterator, List, Optional, Tuple

from django.core.cache import cache
from django.db import close_old_connections
from django.utils import timezone
from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage

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
    "rich_dad_coach": "agents.rich_dad_coach.agent.RichDadCoachAgent",
}


# Kiyosaki spine: which specialist helps exit which investor level / phase.
# Used by the Rich Dad Coach to narrate progress and in UI copy.
RICH_DAD_SPECIALIST_MAP = {
    "debt_manager": {"exits_level": 1, "phase": 1, "frame": "escape Level 1 Borrower"},
    "savings_optimizer": {"exits_level": 2, "phase": 2, "frame": "escape Level 2 Saver"},
    "investment_advisor": {"exits_level": 4, "phase": 4, "frame": "reach Level 4-5 Investor"},
    "opportunity_scout": {"exits_level": 5, "phase": 4, "frame": "source Phase 4 deal flow"},
    "behavioral_coach": {"exits_level": 0, "phase": 1, "frame": "Phase 1 mental prep"},
    "life_planner": {"exits_level": 3, "phase": 2, "frame": "Phase 2 pick your plan"},
    "tax_advisor": {"exits_level": 4, "phase": 4, "frame": "Investor Control 4 - taxes"},
    "risk_assessor": {"exits_level": 4, "phase": 4, "frame": "Investor Controls 1-3"},
    "education": {"exits_level": 0, "phase": 1, "frame": "3 E's - Education"},
    "accountant": {"exits_level": 0, "phase": 1, "frame": "Personal Financial Statement"},
    "researcher": {"exits_level": 0, "phase": 1, "frame": "Phase 1 research"},
    "economist": {"exits_level": 0, "phase": 1, "frame": "Phase 1 macro context"},
    "rich_dad_coach": {"exits_level": 0, "phase": 1, "frame": "NairaSage Coach"},
}

_ROUTE_CACHE_TTL = 3600
_ROUTE_CACHE_PREFIX = "coord_route:v1"


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


_GREETINGS = {
    "hi", "hii", "hiii", "hello", "helo", "hey", "heyy", "yo", "sup", "hiya",
    "good morning", "good afternoon", "good evening", "good day", "gm", "ga",
    "how far", "howfar", "how you dey", "how you dey?", "abeg", "hey there",
    "hello there", "hi there", "greetings", "morning", "evening", "afternoon",
}
_THANKS = {"thanks", "thank you", "thank u", "thx", "ty", "tnx", "thanks!", "thank you!", "much appreciated", "appreciate it", "nice one", "well done"}
_HOWAREYOU = {"how are you", "how are you?", "how are you doing", "how's it going", "hows it going", "how do you do", "and you", "how are u"}


def _smalltalk_reply(message: str, first_name: str = "") -> Optional[str]:
    """Warm reply for greetings / thanks / 'how are you' so they aren't routed
    to a finance specialist. Returns None for anything that needs real help."""
    norm = message.strip().lower().strip("!.? ")
    if not norm or len(norm) > 40:
        return None
    name = f" {first_name}" if first_name else ""
    if norm in _THANKS:
        return (
            f"You're very welcome{name}! 😊 I'm always here whenever you need a hand "
            "with your money. Anything else I can help you with?"
        )
    if norm in _HOWAREYOU:
        return (
            f"I'm doing great, thanks for asking{name}! 😊 More importantly — how are you, "
            "and what can I help you sort out with your money today?"
        )
    if norm in _GREETINGS or (len(norm) <= 12 and any(norm.startswith(g) for g in ("hi", "hey", "hello", "yo", "good "))):
        return (
            f"Hey{name}! 👋 I'm NairaSage, your personal money co-pilot. I can help with "
            "budgeting, saving, investing, debt, tax, or just figuring out your next smart "
            "move with your Naira. What's on your mind today?"
        )
    return None


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

    def _iter_agents_parallel(
        self, agent_names: List[str], message: str
    ) -> Iterator[Tuple[str, Dict[str, Any]]]:
        """Run specialists in parallel while yielding their lifecycle as it happens.

        Yields ("agent_started", {...}) / ("agent_finished", {...}) tuples in real
        time via a queue bridging the worker threads to this generator, then a
        final ("results", {agent: payload}) carrying the collected reports. The
        SSE consumer turns these into live orchestration events; they also act
        as keepalives during the otherwise-silent parallel phase.
        """
        names = [n for n in agent_names if AGENT_REGISTRY.get(n)]
        if not names:
            names = ["accountant"]
        q: "queue.Queue[Tuple[str, Dict[str, Any], Dict[str, Any]]]" = queue.Queue()

        def worker(name: str) -> None:
            frame = RICH_DAD_SPECIALIST_MAP.get(name, {}).get("frame", "")
            q.put(("agent_started", {"agent": name, "frame": frame}, {}))
            t0 = time.time()
            _, payload = self._run_single_agent(name, message)
            q.put(
                (
                    "agent_finished",
                    {
                        "agent": name,
                        "ms": int((time.time() - t0) * 1000),
                        "confidence": payload.get("confidence", 0.0),
                        "summary_preview": str(payload.get("summary", ""))[:160],
                    },
                    payload,
                )
            )

        results: Dict[str, Any] = {}
        with ThreadPoolExecutor(max_workers=min(3, len(names))) as pool:
            for n in names:
                pool.submit(worker, n)
            finished = 0
            while finished < len(names):
                try:
                    kind, public, payload = q.get(timeout=300)
                except queue.Empty:
                    logger.error("Agent lifecycle queue timed out; continuing with partial results")
                    break
                if kind == "agent_finished":
                    finished += 1
                    results[public["agent"]] = payload
                yield kind, public
        yield "results", {n: results[n] for n in names if n in results}

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

    def _should_reframe(self, agents: List[str]) -> bool:
        """Run the Rich Dad reframer when the user has completed onboarding
        and the primary specialist is not already the Rich Dad Coach itself."""
        try:
            if not (self.dna and self.dna.primary_motivation):
                return False
        except Exception:  # noqa: BLE001
            return False
        return "rich_dad_coach" not in (agents or [])

    def _reframe(self, text: str) -> str:
        try:
            from agents.rich_dad_coach.agent import reframe_reply

            return reframe_reply(self.user_id, text)
        except Exception as e:  # noqa: BLE001
            logger.exception("Rich Dad reframer failed: %s", e)
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

        first_name = (getattr(self.dna.user, "first_name", "") or "").strip()
        smalltalk = _smalltalk_reply(message, first_name)
        if smalltalk:
            session = self._session_for_user(session_id)
            outcome = SkillOutcome.objects.create(
                user_id=self.user_id,
                session=session,
                intent_bucket="greeting",
                agents_called=[],
                user_query=message[:500],
                assistant_response=smalltalk,
                response_time_ms=int((time.time() - start) * 1000),
            )
            self._touch_session_after_outcome(session, message)
            return {
                "response": smalltalk,
                "agents_used": [],
                "intent": "greeting",
                "outcome_id": outcome.id,
            }

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
        if "rich_dad_coach" in agents:
            from agents.rich_dad_coach.agent import RichDadCoachAgent

            coach = RichDadCoachAgent(self.user_id)
            response_text = coach.chat(message)
            results = {
                "rich_dad_coach": {
                    "summary": response_text,
                    "data": {},
                    "confidence": 0.85,
                }
            }
        else:
            results = self._run_agents_parallel(agents, message)
            response_text = self._synthesize(message, results)
            if self._should_reframe(agents):
                response_text = self._reframe(response_text)
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

        # Greetings / thanks / small talk: reply warmly without routing to a
        # finance specialist (faster, and far friendlier than a money lecture).
        first_name = (getattr(self.dna.user, "first_name", "") or "").strip()
        smalltalk = _smalltalk_reply(message, first_name)
        if smalltalk:
            yield _sse("meta", {"agents_used": [], "intent": "greeting"})
            for word in smalltalk.split(" "):
                yield _sse("delta", {"text": word + " "})
            outcome = SkillOutcome.objects.create(
                user_id=self.user_id,
                session=session,
                intent_bucket="greeting",
                agents_called=[],
                user_query=message[:500],
                assistant_response=smalltalk,
                response_time_ms=int((time.time() - start) * 1000),
            )
            self._touch_session_after_outcome(session, message)
            yield _sse(
                "done",
                {"outcome_id": outcome.id, "response_length": len(smalltalk)},
            )
            return

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
        yield _sse(
            "routing",
            {
                "agents": [
                    {
                        "agent": a,
                        "frame": RICH_DAD_SPECIALIST_MAP.get(a, {}).get("frame", ""),
                    }
                    for a in agents
                ],
                "intent": bucket,
            },
        )

        pieces_acc: List[str] = []
        results: Dict[str, Any] = {}
        if "rich_dad_coach" in agents:
            from agents.rich_dad_coach.agent import RichDadCoachAgent

            coach_started = time.time()
            yield _sse(
                "agent_started",
                {"agent": "rich_dad_coach", "frame": "NairaSage Coach"},
            )
            coach = RichDadCoachAgent(self.user_id)
            for line in coach.iter_sse_turn(
                message, session_id, pieces_acc, emit=_sse
            ):
                yield line
            full_response = "".join(pieces_acc)
            yield _sse(
                "agent_finished",
                {
                    "agent": "rich_dad_coach",
                    "ms": int((time.time() - coach_started) * 1000),
                    "confidence": 0.85,
                },
            )
            results = {
                "rich_dad_coach": {
                    "summary": full_response,
                    "data": {},
                    "confidence": 0.85,
                }
            }
        else:
            for kind, payload in self._iter_agents_parallel(agents, message):
                if kind == "results":
                    results = payload
                else:
                    yield _sse(kind, payload)
            yield _sse("synthesis_started", {"agents": list(results.keys())})

            llm = get_synthesis_llm()
            messages = self._synthesis_messages(message, results)
            pieces: List[str] = []
            synthesis_error = None
            # Free-tier rate limits make the first synthesis call fail intermittently
            # (the 3 parallel specialists fire just before it). Retry while nothing has
            # streamed yet, so a transient error never surfaces "could not complete"
            # ahead of the real answer.
            for attempt in range(3):
                try:
                    for chunk in llm.stream(messages):
                        text = _stream_chunk_text(chunk)
                        if text:
                            pieces.append(text)
                            yield _sse("delta", {"text": text})
                    synthesis_error = None
                    break
                except Exception as e:  # noqa: BLE001
                    synthesis_error = e
                    logger.warning(
                        "Synthesis stream failed (attempt %s/3): %s", attempt + 1, e
                    )
                    if pieces:
                        break  # partial content already sent; don't restart it
                    time.sleep(0.8 * (attempt + 1))

            if synthesis_error is not None and not pieces:
                err = "I could not complete the response. Please try again."
                pieces.append(err)
                yield _sse("delta", {"text": err})

            full_response = "".join(pieces)

            # Only reframe a successful synthesis — never the error fallback, or a
            # fresh answer would get concatenated after the "could not complete" text.
            if synthesis_error is None and self._should_reframe(agents):
                try:
                    reframed = self._reframe(full_response)
                    addition = (
                        reframed[len(full_response) :]
                        if reframed.startswith(full_response)
                        else ""
                    )
                    if addition:
                        yield _sse("delta", {"text": addition})
                        full_response = reframed
                except Exception as e:  # noqa: BLE001
                    logger.exception("Streaming reframe append failed: %s", e)

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
