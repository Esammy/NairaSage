from __future__ import annotations

import importlib

from typing import Union

from django.db.models import Prefetch
from django.http import StreamingHttpResponse
from rest_framework import generics, permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from agents.coordinator import AGENT_REGISTRY, CoordinatorAgent
from apps.renderers import EventStreamRenderer
from apps.users.models import CoordinatorChatSession, FinancialDNA, SkillOutcome
from apps.users.serializers import (
    CoordinatorChatSessionDetailSerializer,
    CoordinatorChatSessionSerializer,
    SkillOutcomeSerializer,
)
from core.permissions import IsEmailVerified


class _AgentBaseMixin:
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]


def _parse_session_id(request) -> Union[int, None, Response]:
    raw = request.data.get("session_id")
    if raw is None or raw == "":
        return None
    try:
        sid = int(raw)
    except (TypeError, ValueError):
        return Response(
            {"error": "invalid session_id"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not CoordinatorChatSession.objects.filter(pk=sid, user=request.user).exists():
        return Response(
            {"error": "Chat session not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return sid


class CoordinatorChatView(_AgentBaseMixin, APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response(
                {"error": "message is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session_id = _parse_session_id(request)
        if isinstance(session_id, Response):
            return session_id
        coordinator = CoordinatorAgent(user_id=request.user.id)
        result = coordinator.dispatch(message, session_id=session_id)
        return Response(result)


class CoordinatorChatStreamView(_AgentBaseMixin, APIView):
    """
    SSE stream: event meta → many delta → done.
    Delta payload: {"text": "..."} — concatenate text for full reply.
    """

    renderer_classes = [JSONRenderer, EventStreamRenderer]

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response(
                {"error": "message is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session_id = _parse_session_id(request)
        if isinstance(session_id, Response):
            return session_id
        coordinator = CoordinatorAgent(user_id=request.user.id)

        def event_stream():
            for line in coordinator.iter_sse(message, session_id=session_id):
                yield line

        resp = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream; charset=utf-8",
        )
        resp["Cache-Control"] = "no-cache, no-transform"
        resp["X-Accel-Buffering"] = "no"
        return resp


class CoordinatorConversationListView(_AgentBaseMixin, ListAPIView):
    """Paginated coordinator chat turns (SkillOutcome rows for this user)."""

    serializer_class = SkillOutcomeSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def get_queryset(self):
        return SkillOutcome.objects.filter(user=self.request.user).order_by("-created_at")


class CoordinatorChatSessionListCreateView(_AgentBaseMixin, generics.ListCreateAPIView):
    """List chat threads (newest first) or create an empty thread for a new conversation."""

    serializer_class = CoordinatorChatSessionSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def get_queryset(self):
        return CoordinatorChatSession.objects.filter(user=self.request.user).order_by(
            "-updated_at"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CoordinatorChatSessionDetailView(_AgentBaseMixin, generics.RetrieveAPIView):
    """One thread with ordered turns (for resuming a conversation)."""

    serializer_class = CoordinatorChatSessionDetailSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def get_queryset(self):
        return (
            CoordinatorChatSession.objects.filter(user=self.request.user)
            .prefetch_related(
                Prefetch(
                    "outcomes",
                    queryset=SkillOutcome.objects.order_by("created_at"),
                )
            )
            .order_by("-updated_at")
        )


class AgentDirectView(_AgentBaseMixin, APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request, agent: str):
        message = (request.data.get("message") or "").strip()
        path = AGENT_REGISTRY.get(agent)
        if not path:
            return Response(
                {"error": f"Unknown agent: {agent}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        mod_path, cls_name = path.rsplit(".", 1)
        module = importlib.import_module(mod_path)
        AgentCls = getattr(module, cls_name)
        agent_obj = AgentCls(user_id=request.user.id)
        result = agent_obj.run({"query": message})
        return Response(result)


class FeedbackView(_AgentBaseMixin, APIView):
    def post(self, request, outcome_id: int):
        helpful = request.data.get("helpful", None)
        if helpful is None:
            return Response(
                {"error": "helpful field required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        coordinator = CoordinatorAgent(user_id=request.user.id)
        ok = coordinator.record_feedback(outcome_id, bool(helpful))
        if not ok:
            return Response(
                {"error": "outcome not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"status": "recorded"})


class AgentHistoryView(_AgentBaseMixin, APIView):
    def get(self, request, agent: str):
        dna, _ = FinancialDNA.objects.get_or_create(user=request.user)
        memory = dna.agent_memory.get(agent, {})
        return Response({"agent": agent, "memory": memory})


class ClearHistoryView(_AgentBaseMixin, APIView):
    def delete(self, request, agent: str):
        dna, _ = FinancialDNA.objects.get_or_create(user=request.user)
        block = dict(dna.agent_memory)
        block.pop(agent, None)
        dna.agent_memory = block
        dna.save()
        return Response({"status": "cleared"})


class ScenarioView(_AgentBaseMixin, APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request):
        from agents.life_planner.agent import LifePlannerAgent

        scenario = (request.data.get("scenario") or request.data.get("message") or "").strip()
        if not scenario:
            return Response(
                {"error": "scenario or message required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        agent = LifePlannerAgent(user_id=request.user.id)
        result = agent.run({"query": f"Scenario war-game: {scenario}"})
        return Response(result)
