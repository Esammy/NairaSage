from rest_framework import generics, permissions, viewsets
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.models import FinancialDNA, User, UserGoal
from apps.users.serializers import (
    FinancialDNASerializer,
    RegisterSerializer,
    UserGoalSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ThrottledTokenView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "auth"


class FinancialDNAView(generics.RetrieveUpdateAPIView):
    serializer_class = FinancialDNASerializer

    def get_object(self):
        dna, _ = FinancialDNA.objects.get_or_create(user=self.request.user)
        return dna


class UserGoalViewSet(viewsets.ModelViewSet):
    serializer_class = UserGoalSerializer

    def get_queryset(self):
        return UserGoal.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
