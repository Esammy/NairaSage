from rest_framework import generics, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.investments.models import Portfolio, PortfolioHolding
from apps.investments.serializers import (
    PortfolioHoldingSerializer,
    PortfolioSerializer,
)
from integrations.ngx.client import NGXClient


class PortfolioDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PortfolioSerializer

    def get_object(self):
        p, _ = Portfolio.objects.get_or_create(user=self.request.user)
        return p


class PortfolioHoldingViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioHoldingSerializer

    def get_queryset(self):
        p, _ = Portfolio.objects.get_or_create(user=self.request.user)
        return PortfolioHolding.objects.filter(portfolio=p)

    def perform_create(self, serializer):
        p, _ = Portfolio.objects.get_or_create(user=self.request.user)
        serializer.save(portfolio=p)


class MarketQuoteView(APIView):
    def get(self, request):
        symbol = request.query_params.get("symbol", "").upper()
        if not symbol:
            return Response({"error": "symbol required"}, status=400)
        q = NGXClient().get_quote(symbol)
        return Response({"symbol": symbol, "quote": q})
