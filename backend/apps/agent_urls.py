from django.urls import path

from apps import agent_views

urlpatterns = [
    path("chat/", agent_views.CoordinatorChatView.as_view()),
    path("chat/stream/", agent_views.CoordinatorChatStreamView.as_view()),
    path(
        "conversations/",
        agent_views.CoordinatorConversationListView.as_view(),
    ),
    path(
        "chat-sessions/",
        agent_views.CoordinatorChatSessionListCreateView.as_view(),
    ),
    path(
        "chat-sessions/<int:pk>/",
        agent_views.CoordinatorChatSessionDetailView.as_view(),
    ),
    path(
        "accountant/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "accountant"},
    ),
    path(
        "investment-advisor/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "investment_advisor"},
    ),
    path(
        "tax-advisor/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "tax_advisor"},
    ),
    path(
        "behavioral-coach/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "behavioral_coach"},
    ),
    path(
        "life-planner/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "life_planner"},
    ),
    path(
        "opportunity-scout/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "opportunity_scout"},
    ),
    path(
        "debt-manager/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "debt_manager"},
    ),
    path(
        "educator/",
        agent_views.AgentDirectView.as_view(),
        {"agent": "education"},
    ),
    path("scenario/", agent_views.ScenarioView.as_view()),
    path(
        "feedback/<int:outcome_id>/",
        agent_views.FeedbackView.as_view(),
    ),
    path("history/<str:agent>/", agent_views.AgentHistoryView.as_view()),
    path(
        "history/<str:agent>/clear/",
        agent_views.ClearHistoryView.as_view(),
    ),
]
