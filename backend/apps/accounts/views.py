from decimal import Decimal

from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import BankAccount
from apps.accounts.serializers import BankAccountSerializer
from apps.debt.models import Debt
from apps.goals.models import SavingsGoal
from apps.investments.models import Portfolio
from apps.opportunities.models import Opportunity


class DashboardSummaryView(APIView):
    """
    Single definition of headline figures for the dashboard.

    net_worth = sum(active bank balances) + portfolio total_value − sum(debt outstanding).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        cash = (
            BankAccount.objects.filter(user=user, is_active=True).aggregate(
                t=Sum("balance")
            )["t"]
            or Decimal("0")
        )
        portfolio = Portfolio.objects.filter(user=user).first()
        investments = portfolio.total_value if portfolio else Decimal("0")
        debt_qs = Debt.objects.filter(user=user)
        debt_total = debt_qs.aggregate(t=Sum("outstanding"))["t"] or Decimal("0")
        monthly_debt = debt_qs.aggregate(t=Sum("monthly_payment"))["t"] or Decimal("0")
        goal_count = SavingsGoal.objects.filter(user=user).count()
        pending_opportunities = Opportunity.objects.filter(
            user=user, is_dismissed=False, is_actioned=False
        ).count()
        net_worth = cash + investments - debt_total

        def _dec(x):
            return format(x, "f")

        return Response(
            {
                "cash_total": _dec(cash),
                "investments_total": _dec(investments),
                "debt_total": _dec(debt_total),
                "net_worth": _dec(net_worth),
                "monthly_debt_service": _dec(monthly_debt),
                "goal_count": goal_count,
                "pending_opportunities": pending_opportunities,
            }
        )


class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user).order_by("-linked_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
