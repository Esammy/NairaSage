"""Agent Society efficiency benchmark: coordinator vs single-agent baseline.

For each canned finance question, runs:
  A) the multi-agent path — coordinator routing -> parallel specialists ->
     synthesis (exactly what production does), and
  B) a single-agent baseline — one monolithic prompt to the same flagship model.

Then a judge model (qwen3-max) blind-scores both answers 1-10 on grounding,
Nigeria-specificity, and actionability. Results land in ../docs/BENCHMARK.md.

Run (needs a user in the DB and DASHSCOPE_API_KEY):
    venv\\Scripts\\python.exe scripts\\benchmark_agents.py --user-email you@example.com
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django  # noqa: E402

django.setup()

from langchain_core.messages import HumanMessage, SystemMessage  # noqa: E402

from agents.coordinator import CoordinatorAgent  # noqa: E402
from core.llm_factory import get_synthesis_llm  # noqa: E402
from core.utils import extract_json_object  # noqa: E402

QUESTIONS = [
    "I earn 450k naira a month and spend almost all of it. How do I start investing?",
    "Should I pay off my 2M naira car loan early or invest the spare 100k a month?",
    "Inflation is eating my savings. Where can I park 1.5M naira for 12 months?",
    "How do I reduce my PAYE tax burden legally as a salaried Lagos worker?",
    "I keep impulse-buying gadgets every payday. Help me stop.",
    "Is now a good time to buy NGX banking stocks given CBN policy?",
    "I want to buy a rental flat in Ibadan for 25M. Walk me through the numbers.",
    "What side income could add 200k a month given I am a software developer?",
    "My company offers a pension AVC. Should I increase contributions or invest myself?",
    "How much do I need invested to cover 600k a month in expenses forever?",
]

SINGLE_AGENT_SYSTEM = (
    "You are a helpful Nigerian personal-finance assistant. Answer the user's "
    "question with specific, actionable advice for the Nigerian context."
)

JUDGE_SYSTEM = """You are grading two anonymous answers (A and B) to the same
personal-finance question from a Nigerian user. Score each answer 1-10 for:
grounded reasoning, Nigeria-specific accuracy (NGX, CBN, FIRS, naira reality),
and actionability. Reply with exactly one JSON object:
{"a_score": <1-10>, "b_score": <1-10>, "rationale": "<one sentence>"}"""


def run_benchmark(user_id: int) -> list[dict]:
    coordinator = CoordinatorAgent(user_id=user_id)
    baseline_llm = get_synthesis_llm()
    judge_llm = get_synthesis_llm()
    rows: list[dict] = []

    for i, q in enumerate(QUESTIONS, 1):
        print(f"[{i}/{len(QUESTIONS)}] {q[:60]}...")

        t0 = time.time()
        multi = coordinator.dispatch(q)
        multi_ms = int((time.time() - t0) * 1000)

        t0 = time.time()
        single_resp = baseline_llm.invoke(
            [SystemMessage(content=SINGLE_AGENT_SYSTEM), HumanMessage(content=q)]
        )
        single_ms = int((time.time() - t0) * 1000)
        single_text = str(getattr(single_resp, "content", single_resp))

        judge_resp = judge_llm.invoke(
            [
                SystemMessage(content=JUDGE_SYSTEM),
                HumanMessage(
                    content=(
                        f"Question: {q}\n\n"
                        f"Answer A:\n{multi['response'][:4000]}\n\n"
                        f"Answer B:\n{single_text[:4000]}"
                    )
                ),
            ]
        )
        try:
            verdict = json.loads(
                extract_json_object(str(getattr(judge_resp, "content", "")))
            )
        except (json.JSONDecodeError, ValueError):
            verdict = {"a_score": 0, "b_score": 0, "rationale": "judge parse failed"}

        rows.append(
            {
                "question": q,
                "agents_used": multi["agents_used"],
                "multi_ms": multi_ms,
                "single_ms": single_ms,
                "multi_score": float(verdict.get("a_score", 0)),
                "single_score": float(verdict.get("b_score", 0)),
                "rationale": str(verdict.get("rationale", "")),
            }
        )
    return rows


def write_report(rows: list[dict], out_path: Path) -> None:
    multi_avg = statistics.mean(r["multi_score"] for r in rows)
    single_avg = statistics.mean(r["single_score"] for r in rows)
    multi_ms = statistics.mean(r["multi_ms"] for r in rows)
    single_ms = statistics.mean(r["single_ms"] for r in rows)

    lines = [
        "# Agent Society vs Single Agent — Benchmark",
        "",
        "Method: each question runs through (A) NairaSage's coordinator "
        "(routing -> up to 3 parallel specialists -> synthesis) and (B) one "
        "monolithic prompt to the same flagship Qwen model. A qwen3-max judge "
        "blind-scores both answers 1-10 (grounding, Nigeria-specificity, "
        "actionability). Generated by `backend/scripts/benchmark_agents.py`.",
        "",
        f"| Metric | Multi-agent (A) | Single-agent (B) |",
        f"|---|---|---|",
        f"| Avg judge score | **{multi_avg:.1f}/10** | {single_avg:.1f}/10 |",
        f"| Avg latency | {multi_ms / 1000:.1f}s | {single_ms / 1000:.1f}s |",
        "",
        "| # | Question | Agents used | A score | B score | A ms | B ms |",
        "|---|---|---|---|---|---|---|",
    ]
    for i, r in enumerate(rows, 1):
        agents = ", ".join(r["agents_used"])
        lines.append(
            f"| {i} | {r['question'][:60]}… | {agents} | {r['multi_score']:.0f} "
            f"| {r['single_score']:.0f} | {r['multi_ms']} | {r['single_ms']} |"
        )
    lines += ["", "## Judge rationales", ""]
    lines += [f"{i}. {r['rationale']}" for i, r in enumerate(rows, 1)]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nReport written to {out_path}")
    print(f"Multi-agent {multi_avg:.1f}/10 vs single-agent {single_avg:.1f}/10")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-email", required=True, help="Existing user to run as")
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parents[2] / "docs" / "BENCHMARK.md"),
    )
    args = parser.parse_args()

    from apps.users.models import User

    user = User.objects.filter(email=args.user_email).first()
    if not user:
        print(f"No user with email {args.user_email}")
        return 2

    rows = run_benchmark(user.id)
    write_report(rows, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
