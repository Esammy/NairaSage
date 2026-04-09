"""
Extract SYSTEM_PROMPT bodies from repo-root agentsPrompts.txt into backend/agents/*/prompts.py
Run from backend: python scripts/extract_agent_prompts.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND = Path(__file__).resolve().parent.parent
TXT = ROOT / "agentsPrompts.txt"

# Marker after each SYSTEM_PROMPT block (start of next major section)
MARKERS = [
    ("accountant", r"\nEconomist Agent\n"),
    ("economist", r"\nInvestment Advisor Agent\n"),
    ("investment_advisor", r"\nOpportunity Scout Agent\n"),
    ("opportunity_scout", r"\nTax Advisor Agent\n"),
    ("tax_advisor", r"\nBehavioral Coach Agent\n"),
    ("behavioral_coach", r"\nDebt Manager Agent\n"),
    ("debt_manager", r"\nSavings Optimizer Agent\n"),
    ("savings_optimizer", r"\nRisk Assessor Agent\n"),
    ("risk_assessor", r"\nLife Planner Agent\n"),
    ("life_planner", r"\nEducation Agent\n"),
    ("education", r"\nImplementation Notes\n"),
]


def main() -> None:
    if not TXT.is_file():
        print("Missing", TXT, file=sys.stderr)
        sys.exit(1)
    text = TXT.read_text(encoding="utf-8")
    # Line must be exactly SYSTEM_PROMPT (not ROUTING_SYSTEM_PROMPT / SYNTHESIS_SYSTEM_PROMPT)
    start_pat = re.compile(r"^SYSTEM_PROMPT\s*\n", re.MULTILINE)
    pos = 0
    for folder, end_pat in MARKERS:
        m = start_pat.search(text, pos)
        if not m:
            print("No SYSTEM_PROMPT found for", folder, file=sys.stderr)
            sys.exit(1)
        body_start = m.end()
        end_m = re.search(end_pat, text[body_start:], re.MULTILINE)
        if not end_m:
            print("No end marker for", folder, file=sys.stderr)
            sys.exit(1)
        raw = text[body_start : body_start + end_m.start()].rstrip()
        if raw.endswith('"""'):
            raw = raw[:-3].rstrip()
        # Escape for Python triple-quoted string: """ -> use no """ inside (none in doc)
        out_dir = BACKEND / "agents" / folder
        out_file = out_dir / "prompts.py"
        content = f'PROMPT_VERSION = "1.0.0"\n\nSYSTEM_PROMPT = """\n{raw}\n"""\n'
        out_file.write_text(content, encoding="utf-8")
        print("Wrote", out_file)
        pos = body_start + end_m.start()


if __name__ == "__main__":
    main()
