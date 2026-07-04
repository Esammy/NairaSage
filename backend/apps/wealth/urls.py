from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.wealth import views
from apps.wealth.deal_analysis import DealDeepAnalysisView
from apps.wealth.document_scan import DocumentScanView
from apps.wealth.voice_transcribe import QwenTranscribeView

router = DefaultRouter()
router.register(r"snapshots", views.FinancialStatementSnapshotViewSet, basename="snapshot")
router.register(r"assets", views.AssetItemViewSet, basename="asset")
router.register(r"liabilities", views.LiabilityItemViewSet, basename="liability")
router.register(r"deals", views.DealViewSet, basename="deal")
router.register(r"next-actions", views.NextActionViewSet, basename="next-action")
router.register(
    r"coach-memories", views.CoachMemoryViewSet, basename="coach-memory"
)

urlpatterns = [
    path("", include(router.urls)),
    path("cockpit/", views.WealthCockpitView.as_view(), name="wealth-cockpit"),
    path("onboarding/", views.RichDadOnboardingView.as_view(), name="wealth-onboarding"),
    path("quadrant/", views.QuadrantProfileView.as_view(), name="wealth-quadrant"),
    path("level/", views.InvestorLevelView.as_view(), name="wealth-level"),
    path("phase/", views.RichDadPhaseView.as_view(), name="wealth-phase"),
    path("bi-triangle/", views.BITriangleScoreView.as_view(), name="wealth-bi-triangle"),
    path(
        "deals/<int:deal_id>/controls/",
        views.InvestorControlsView.as_view(),
        name="wealth-deal-controls",
    ),
    path(
        "deals/<int:deal_id>/deep-analysis/",
        DealDeepAnalysisView.as_view(),
        name="wealth-deal-deep-analysis",
    ),
    path(
        "actions/propose/",
        views.ActionProposalCreateView.as_view(),
        name="wealth-actions-propose",
    ),
    path(
        "actions/pending/",
        views.ActionProposalPendingView.as_view(),
        name="wealth-actions-pending",
    ),
    path(
        "actions/<int:pk>/confirm/",
        views.ActionProposalConfirmView.as_view(),
        name="wealth-actions-confirm",
    ),
    path(
        "actions/<int:pk>/cancel/",
        views.ActionProposalCancelView.as_view(),
        name="wealth-actions-cancel",
    ),
    path(
        "documents/scan/",
        DocumentScanView.as_view(),
        name="wealth-document-scan",
    ),
    path(
        "voice/token/",
        views.AssemblyAIVoiceTokenView.as_view(),
        name="wealth-voice-token",
    ),
    path(
        "voice/transcribe/",
        QwenTranscribeView.as_view(),
        name="wealth-voice-transcribe",
    ),
]
