"""REST API views for the Rich Dad Wealth domain."""

from __future__ import annotations

import datetime as dt
import time
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.wealth.actions import (
    cancel_proposal,
    confirm_proposal,
    create_proposal,
)
from apps.wealth.models import (
    ActionProposal,
    AssetItem,
    BITriangleScore,
    CoachMemory,
    Deal,
    FinancialStatementSnapshot,
    InvestorControlsChecklist,
    InvestorLevel,
    LiabilityItem,
    NextAction,
    QuadrantProfile,
    RichDadPhase,
)
from apps.wealth.serializers import (
    ActionProposalSerializer,
    AssetItemSerializer,
    BITriangleScoreSerializer,
    CoachMemorySerializer,
    DealSerializer,
    FinancialStatementSnapshotSerializer,
    InvestorControlsChecklistSerializer,
    InvestorLevelSerializer,
    LiabilityItemSerializer,
    NextActionSerializer,
    QuadrantProfileSerializer,
    RichDadPhaseSerializer,
)
from apps.wealth.services import (
    PHASE_MILESTONES,
    SnapshotInputs,
    assess_investor_level,
    compose_snapshot,
    seed_rich_dad_onboarding,
    suggest_next_action,
)


def _snapshot_data_completeness(snap: FinancialStatementSnapshot) -> float:
    """Share of statement buckets filled (0..1) for trust UI."""
    fields = (
        snap.income_active,
        snap.income_passive,
        snap.income_portfolio,
        snap.expenses_essential,
        snap.expenses_doodad,
        snap.assets_cashflow,
        snap.assets_appreciation,
        snap.liabilities_good,
        snap.liabilities_bad,
    )
    filled = sum(1 for f in fields if f and f != 0)
    return round(filled / 9.0, 3)


def build_cockpit_payload(user):
    """Same aggregate as WealthCockpitView (for post-action refresh)."""
    today = dt.date.today().replace(day=1)
    snaps = list(
        FinancialStatementSnapshot.objects.filter(user=user).order_by("-period_month")[:2]
    )
    snap = snaps[0] if snaps else None
    if snap is None:
        snap = compose_snapshot(user, SnapshotInputs(period_month=today))
        snaps = [snap]

    cockpit_trend = None
    if len(snaps) >= 2:
        cur, prev = snaps[0], snaps[1]
        cockpit_trend = {
            "freedom_ratio_delta": round(
                float(cur.freedom_ratio or 0) - float(prev.freedom_ratio or 0),
                4,
            ),
            "prior_period_month": prev.period_month.isoformat(),
        }

    quadrant, _ = QuadrantProfile.objects.get_or_create(user=user)
    level, _ = InvestorLevel.objects.get_or_create(user=user)
    phase, _ = RichDadPhase.objects.get_or_create(user=user)

    active_action = (
        NextAction.objects.filter(user=user, is_done=False, is_dismissed=False)
        .order_by("priority", "-created_at")
        .first()
        or suggest_next_action(user)
    )

    return {
        "snapshot": FinancialStatementSnapshotSerializer(snap).data,
        "quadrant": QuadrantProfileSerializer(quadrant).data,
        "investor_level": InvestorLevelSerializer(level).data,
        "phase": RichDadPhaseSerializer(phase).data,
        "next_action": (
            NextActionSerializer(active_action).data if active_action else None
        ),
        "milestones_catalog": PHASE_MILESTONES,
        "cockpit_trend": cockpit_trend,
        "snapshot_updated_at": snap.updated_at.isoformat() if snap.updated_at else None,
        "period_month": snap.period_month.isoformat() if snap.period_month else None,
        "data_completeness": _snapshot_data_completeness(snap),
    }


class FinancialStatementSnapshotViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialStatementSnapshotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FinancialStatementSnapshot.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        today = dt.date.today().replace(day=1)
        snap = (
            FinancialStatementSnapshot.objects.filter(
                user=request.user, period_month__lte=today,
            )
            .order_by("-period_month")
            .first()
        )
        if snap is None:
            snap = compose_snapshot(
                request.user, SnapshotInputs(period_month=today),
            )
        return Response(FinancialStatementSnapshotSerializer(snap).data)

    @action(detail=False, methods=["post"], url_path="recompute")
    def recompute(self, request):
        """Recompute the current month's snapshot from user-supplied income / expense numbers."""
        payload = request.data or {}
        today = dt.date.today().replace(day=1)
        inputs = SnapshotInputs(
            period_month=today,
            income_active=Decimal(str(payload.get("income_active", 0))),
            income_passive=Decimal(str(payload.get("income_passive", 0))),
            income_portfolio=Decimal(str(payload.get("income_portfolio", 0))),
            expenses_essential=Decimal(str(payload.get("expenses_essential", 0))),
            expenses_doodad=Decimal(str(payload.get("expenses_doodad", 0))),
        )
        snap = compose_snapshot(request.user, inputs)
        # Re-assess level now that the statement is current.
        lvl_obj, _ = InvestorLevel.objects.get_or_create(user=request.user)
        level, sublevel, debug = assess_investor_level(
            snap,
            AssetItem.objects.filter(user=request.user, is_active=True),
            LiabilityItem.objects.filter(user=request.user, is_active=True),
        )
        if level != lvl_obj.current_level or sublevel != lvl_obj.current_sublevel:
            history = list(lvl_obj.level_history or [])
            history.append({
                "level": level,
                "sublevel": sublevel,
                "changed_at": dt.datetime.now().isoformat(),
                "reason": "recompute",
                "debug": debug,
            })
            lvl_obj.level_history = history
        lvl_obj.current_level = level
        lvl_obj.current_sublevel = sublevel
        lvl_obj.last_assessment_score = debug
        lvl_obj.save()
        return Response(FinancialStatementSnapshotSerializer(snap).data)


class AssetItemViewSet(viewsets.ModelViewSet):
    serializer_class = AssetItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AssetItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LiabilityItemViewSet(viewsets.ModelViewSet):
    serializer_class = LiabilityItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LiabilityItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class QuadrantProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = QuadrantProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = QuadrantProfile.objects.get_or_create(user=self.request.user)
        return obj


class InvestorLevelView(generics.RetrieveAPIView):
    serializer_class = InvestorLevelSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = InvestorLevel.objects.get_or_create(user=self.request.user)
        return obj


class RichDadPhaseView(generics.RetrieveUpdateAPIView):
    serializer_class = RichDadPhaseSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = RichDadPhase.objects.get_or_create(user=self.request.user)
        return obj


class BITriangleScoreView(generics.RetrieveUpdateAPIView):
    serializer_class = BITriangleScoreSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = BITriangleScore.objects.get_or_create(user=self.request.user)
        return obj


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Deal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        deal = serializer.save(user=self.request.user)
        InvestorControlsChecklist.objects.get_or_create(deal=deal)


class InvestorControlsView(generics.RetrieveUpdateAPIView):
    serializer_class = InvestorControlsChecklistSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        deal = get_object_or_404(
            Deal, pk=self.kwargs["deal_id"], user=self.request.user,
        )
        obj, _ = InvestorControlsChecklist.objects.get_or_create(deal=deal)
        return obj


class NextActionViewSet(viewsets.ModelViewSet):
    serializer_class = NextActionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NextAction.objects.filter(user=self.request.user).order_by(
            "priority", "-created_at"
        )

    @action(detail=False, methods=["get"], url_path="active")
    def active_action(self, request):
        active = (
            NextAction.objects.filter(
                user=request.user, is_done=False, is_dismissed=False
            )
            .order_by("priority", "-created_at")
            .first()
        )
        if active is None:
            active = suggest_next_action(request.user)
        if active is None:
            return Response(None)
        return Response(NextActionSerializer(active).data)

    @action(detail=True, methods=["post"], url_path="done")
    def mark_done(self, request, pk=None):
        obj = self.get_object()
        obj.is_done = True
        obj.done_at = dt.datetime.now()
        obj.save(update_fields=["is_done", "done_at"])
        return Response(NextActionSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        return self.mark_done(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="dismiss")
    def dismiss(self, request, pk=None):
        obj = self.get_object()
        obj.is_dismissed = True
        obj.save(update_fields=["is_dismissed"])
        return Response(NextActionSerializer(obj).data)


class WealthCockpitView(APIView):
    """Single aggregated payload that powers /wealth (the Cockpit)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_cockpit_payload(request.user))


class RichDadOnboardingView(APIView):
    """Seeds the user's Rich Dad models from the onboarding questionnaire."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = request.data or {}
        try:
            seed_rich_dad_onboarding(
                user=request.user,
                primary_motivation=str(payload.get("primary_motivation", "")),
                quadrant_anchor=str(payload.get("quadrant_anchor", ""))[:1].upper(),
                phase_anchor=int(payload.get("phase_anchor", 1)),
                quadrant_split=payload.get("quadrant_split") or {},
                initial_level=int(payload.get("initial_level", 0)),
            )
        except (ValueError, TypeError) as exc:
            return Response(
                {"detail": f"Invalid onboarding payload: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Seed a first next-action.
        suggest_next_action(request.user)
        return Response({"ok": True})


class CoachMemoryViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CoachMemorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CoachMemory.objects.filter(
            user=self.request.user, is_forgotten=False
        ).order_by("-created_at")

    def perform_destroy(self, instance: CoachMemory) -> None:
        instance.is_forgotten = True
        instance.save(update_fields=["is_forgotten"])


class ActionProposalCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tool = (request.data.get("tool") or "").strip()
        args = request.data.get("args") or {}
        if not tool:
            return Response(
                {"detail": "tool is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raw_sid = request.data.get("session_id")
        session_id = None
        if raw_sid is not None and raw_sid != "":
            try:
                session_id = int(raw_sid)
            except (TypeError, ValueError):
                session_id = None
        try:
            prop = create_proposal(
                request.user, tool, args, session_id=session_id
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ActionProposalSerializer(prop).data, status=status.HTTP_201_CREATED
        )


class ActionProposalPendingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            ActionProposal.objects.filter(
                user=request.user, status=ActionProposal.STATUS_PENDING
            )
            .order_by("-created_at")[:40]
        )
        return Response(ActionProposalSerializer(qs, many=True).data)


class ActionProposalConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        proposal = get_object_or_404(ActionProposal, pk=pk, user=request.user)
        override = request.data.get("args")
        if override is not None and not isinstance(override, dict):
            return Response(
                {"detail": "args must be an object"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            audit, result = confirm_proposal(
                proposal,
                request.user,
                override_args=override if isinstance(override, dict) else None,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:  # noqa: BLE001
            return Response(
                {"detail": str(e)[:2000]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "ok": True,
                "audit_id": audit.id,
                "result": result,
                "cockpit": build_cockpit_payload(request.user),
            }
        )


class ActionProposalCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        proposal = get_object_or_404(ActionProposal, pk=pk, user=request.user)
        try:
            cancel_proposal(proposal, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"ok": True})


class AssemblyAIVoiceTokenView(APIView):
    """Mint a short-lived AssemblyAI Universal Streaming token (v3) for the browser."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not settings.ASSEMBLYAI_API_KEY:
            return Response(
                {
                    "detail": "Voice transcription is not configured (missing ASSEMBLYAI_API_KEY).",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        minute_bucket = int(time.time() // 60)
        rl_key = f"aai_voice_tok:{request.user.pk}:{minute_bucket}"
        try:
            n = cache.incr(rl_key)
        except ValueError:
            cache.set(rl_key, 1, 120)
            n = 1
        if n > 30:
            return Response(
                {"detail": "Too many voice token requests. Try again in a minute."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            resp = requests.get(
                "https://streaming.assemblyai.com/v3/token",
                params={
                    "expires_in_seconds": 60,
                    "max_session_duration_seconds": 7200,
                },
                headers={"Authorization": settings.ASSEMBLYAI_API_KEY},
                timeout=15,
            )
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Could not reach AssemblyAI: {exc!s}"[:250]},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code != 200:
            detail = resp.text[:500]
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct:
                try:
                    body = resp.json()
                    detail = str(body.get("error", body))[:500]
                except (ValueError, TypeError):
                    detail = resp.text[:500]
            return Response({"detail": detail}, status=status.HTTP_502_BAD_GATEWAY)

        data = resp.json()
        token = data.get("token")
        if not token:
            return Response(
                {"detail": "Invalid token response from AssemblyAI."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(
            {
                "token": token,
                "expires_in_seconds": data.get("expires_in_seconds", 60),
            }
        )
