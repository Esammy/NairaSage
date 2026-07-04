"""Catalog of wealth UI surfaces for NairaSage Coach (injected into system prompt)."""

from __future__ import annotations

import json
from typing import Any, Dict, List

FEATURES: List[Dict[str, Any]] = [
    {
        "key": "cockpit",
        "route": "/wealth",
        "title": "Wealth Cockpit",
        "what": "Freedom Ratio, mini statement, level, phase, next action.",
        "how": (
            "Open /wealth. The center gauge is Freedom Ratio: passive income "
            "divided by monthly expenses."
        ),
        "examples": ["Show my freedom ratio", "What is my next action?"],
    },
    {
        "key": "statement",
        "route": "/wealth/statement",
        "title": "Personal Financial Statement",
        "what": "Income, expense, asset, and liability rows; monthly snapshot.",
        "how": "Edit line items and income/expense columns; snapshot recomputes Freedom Ratio.",
        "examples": ["Update my passive income", "Add a rental asset"],
    },
    {
        "key": "quadrant",
        "route": "/wealth/quadrant",
        "title": "CASHFLOW Quadrant",
        "what": "E/S/B/I split of how you earn; targets for B and I.",
        "how": "Drag or enter percentages; they should sum to about 100.",
        "examples": ["Shift 10 percent from E to I", "What is my quadrant split?"],
    },
    {
        "key": "path",
        "route": "/wealth/path",
        "title": "Investor Path (Phases)",
        "what": "Five phases of the investor plan with milestones.",
        "how": "Track current phase and check off milestones.",
        "examples": ["Mark my Phase 2 milestone done", "What phase am I in?"],
    },
    {
        "key": "levels",
        "route": "/wealth/levels",
        "title": "Investor Level Ladder",
        "what": "Levels 0 through 6 and history.",
        "how": "Level updates when your statement and assets change.",
        "examples": ["What level am I?", "Why did my level change?"],
    },
    {
        "key": "business",
        "route": "/wealth/business",
        "title": "B-I Triangle",
        "what": "Eight integrities scored 0 to 100 for a business you build or buy.",
        "how": "Edit scores; lowest band is usually the constraint.",
        "examples": ["Update my B-I Triangle", "What is my weakest integrity?"],
    },
    {
        "key": "deals",
        "route": "/wealth/deals",
        "title": "Deals and Investor Controls",
        "what": "Deals with ten investor controls checklist.",
        "how": "Create a deal, then score each control 0 to 3.",
        "examples": ["Add a real estate deal", "Score controls on deal 3"],
    },
    {
        "key": "library",
        "route": "/wealth/library",
        "title": "Library",
        "what": "Framework prompts and references (educational).",
        "how": "Pick a topic to prefill chat with the coach.",
        "examples": ["Explain the rat race", "Walk me through the 10 controls"],
    },
    {
        "key": "chat",
        "route": "/wealth/chat",
        "title": "Coach Chat",
        "what": "Full-page coach with streaming replies and confirm-before-write actions.",
        "how": "Ask in plain language; confirm any data change in the action card.",
        "examples": ["Set my expenses to X", "What is my net worth?"],
    },
    {
        "key": "memory",
        "route": "/wealth/memory",
        "title": "Coach Memory",
        "what": "Facts and preferences the coach remembers; forget any row.",
        "how": "Review list and click forget; or ask the coach to forget a memory (confirm).",
        "examples": ["Forget memory 12", "List what you remember about me"],
    },
    {
        "key": "settings",
        "route": "/wealth/settings",
        "title": "Wealth Settings",
        "what": "Links to profile, notifications, and memory.",
        "how": "Navigate tiles to each area.",
        "examples": ["Open settings", "Where is my profile?"],
    },
]


def feature_guide_json_compact() -> str:
    return json.dumps(FEATURES, ensure_ascii=False)
