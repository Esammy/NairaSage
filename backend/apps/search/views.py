"""Unified per-user search across transactions, goals, deals, and opportunities."""

from __future__ import annotations

from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.opportunities.models import Opportunity
from apps.transactions.models import Transaction
from apps.users.models import UserGoal
from apps.wealth.models import Deal


def _clamp_limit(raw) -> int:
    try:
        n = int(raw)
    except (TypeError, ValueError):
        n = 8
    return max(1, min(n, 25))


class UnifiedSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        limit = _clamp_limit(request.query_params.get("limit", 8))
        if not q:
            return Response({"results": []})

        user = request.user
        per_type = max(2, limit // 4)
        results: list[dict] = []

        for tx in (
            Transaction.objects.filter(account__user=user)
            .filter(Q(description__icontains=q) | Q(merchant__icontains=q))
            .order_by("-date")[:per_type]
        ):
            subtitle = tx.merchant or tx.category or str(tx.date)
            results.append(
                {
                    "type": "transaction",
                    "title": tx.description[:200],
                    "subtitle": subtitle,
                    "route": "/wealth/statement",
                }
            )

        for goal in (
            UserGoal.objects.filter(user=user, title__icontains=q)
            .order_by("-updated_at")[:per_type]
        ):
            results.append(
                {
                    "type": "goal",
                    "title": goal.title,
                    "subtitle": goal.get_goal_type_display(),
                    "route": "/wealth/path",
                }
            )

        for deal in (
            Deal.objects.filter(user=user)
            .filter(Q(title__icontains=q) | Q(notes__icontains=q))
            .order_by("-updated_at")[:per_type]
        ):
            results.append(
                {
                    "type": "deal",
                    "title": deal.title,
                    "subtitle": deal.get_deal_type_display(),
                    "route": f"/wealth/deals/{deal.pk}",
                }
            )

        for opp in (
            Opportunity.objects.filter(user=user)
            .filter(Q(title__icontains=q) | Q(description__icontains=q))
            .order_by("-created_at")[:per_type]
        ):
            results.append(
                {
                    "type": "opportunity",
                    "title": opp.title[:200],
                    "subtitle": opp.get_opp_type_display(),
                    "route": "/wealth/deals",
                }
            )

        return Response({"results": results[:limit]})
