"""Offline check: _iter_agents_parallel yields lifecycle events in real time.

Mocks _run_single_agent (no DB/LLM); verifies started/finished interleaving
and the trailing results payload.
Run: venv\\Scripts\\python.exe scripts\\orchestration_bridge_check.py
"""

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django  # noqa: E402

django.setup()

from agents.coordinator import CoordinatorAgent  # noqa: E402

co = object.__new__(CoordinatorAgent)
co.user_id = 1


def fake_run(name: str, msg: str):
    time.sleep(0.3 if name == "economist" else 0.05)
    return name, {"summary": f"{name} report on {msg}", "data": {}, "confidence": 0.9}


co._run_single_agent = fake_run

events = list(co._iter_agents_parallel(["accountant", "economist", "tax_advisor"], "test q"))
for kind, payload in events:
    label = list(payload.keys()) if kind == "results" else payload
    print(f"  {kind}: {label}")

kinds = [k for k, _ in events]
assert kinds.count("agent_started") == 3, kinds
assert kinds.count("agent_finished") == 3, kinds
assert kinds[-1] == "results" and len(events[-1][1]) == 3
# The slow agent (economist, 300ms) must finish AFTER the fast ones, proving
# events stream as they happen rather than in submission order.
finish_order = [p["agent"] for k, p in events if k == "agent_finished"]
assert finish_order[-1] == "economist", finish_order
print("\nqueue bridge OK: lifecycle events stream in completion order:", finish_order)
