"""Qwen Cloud (Alibaba Cloud Model Studio / DashScope) smoke test.

Validates every Qwen capability NairaSage depends on, over the OpenAI-compatible
endpoint, using the exact LangChain stack from requirements.txt:

  1. Plain completion        (specialist agents     -> ChatOpenAI.invoke)
  2. Streaming               (coordinator synthesis -> ChatOpenAI.stream)
  3. Tool calling round-trip (Rich Dad Coach        -> bind_tools + ToolMessage)
  4. Thinking model          (deal deep-analysis    -> reasoning_content deltas)
  5. Embeddings              (pgvector RAG          -> text-embedding-v4 @ 1024 dims)

Run:  python scripts/qwen_smoke.py            (from the backend/ directory)
Env:  DASHSCOPE_API_KEY  (required)
      DASHSCOPE_BASE_URL (default: https://dashscope-intl.aliyuncs.com/compatible-mode/v1)

DashScope compatible-mode quirks handled here (and mirrored in core/llm_factory.py
and core/embeddings_factory.py):
  - OpenAIEmbeddings tiktoken-encodes inputs into token arrays by default;
    DashScope only accepts raw strings -> check_embedding_ctx_length=False.
  - text-embedding-v4 caps batches at ~10 inputs/request -> chunk_size=10.
  - text-embedding-v4 supports 64-2048 output dims; we pin 1024 to match the
    existing pgvector VectorField(dimensions=1024) so no schema migration needed.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Allow `import core...` when run directly from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Load backend/.env when run directly (mirrors django-environ behaviour).
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

BASE_URL = os.getenv(
    "DASHSCOPE_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
)
API_KEY = os.getenv("DASHSCOPE_API_KEY", "")

CHAT_MODEL = os.getenv("QWEN_MODEL", "qwen3.5-flash")
FLAGSHIP_MODEL = os.getenv("QWEN_SYNTHESIS_MODEL", "qwen3-max")
THINKING_MODEL = os.getenv("QWEN_THINKING_MODEL", "qwen3-235b-a22b-thinking-2507")
EMBED_MODEL = os.getenv("QWEN_EMBED_MODEL", "text-embedding-v4")

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, PASS if ok else FAIL, detail))
    line = f"  [{PASS if ok else FAIL}] {name}" + (f" - {detail}" if detail else "")
    # Windows consoles default to cp1252 and choke on ₦, emoji, etc. Never let a
    # print crash a check that actually passed.
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode("ascii", "replace").decode("ascii"))


def make_llm(model: str, **kwargs) -> ChatOpenAI:
    return ChatOpenAI(model=model, api_key=API_KEY, base_url=BASE_URL, **kwargs)


def check_completion() -> None:
    print(f"\n1) Plain completion ({CHAT_MODEL})")
    llm = make_llm(CHAT_MODEL, temperature=0.2, max_tokens=64)
    t0 = time.time()
    msg = llm.invoke(
        [
            SystemMessage(content="You are a Nigerian finance assistant. Be brief."),
            HumanMessage(content="In one sentence, what is the NGX?"),
        ]
    )
    ok = bool(msg.content and "NGX" in msg.content or "Exchange" in str(msg.content))
    record("invoke", ok, f"{time.time() - t0:.1f}s, {len(str(msg.content))} chars")


def check_streaming() -> None:
    print(f"\n2) Streaming ({FLAGSHIP_MODEL})")
    llm = make_llm(FLAGSHIP_MODEL, temperature=0.2, max_tokens=128)
    chunks = 0
    text = ""
    t0 = time.time()
    for chunk in llm.stream("Count from 1 to 5, words only."):
        chunks += 1
        text += str(chunk.content or "")
    record("stream", chunks > 1 and bool(text), f"{chunks} chunks, {time.time() - t0:.1f}s")


def check_tool_calling() -> None:
    print(f"\n3) Tool-calling round trip ({FLAGSHIP_MODEL})")

    @tool
    def get_freedom_ratio(user_id: int) -> str:
        """Return the user's Freedom Ratio (passive cashflow / monthly expenses)."""
        return '{"freedom_ratio": 0.42, "passive_cashflow_ngn": 210000, "monthly_expenses_ngn": 500000}'

    llm = make_llm(FLAGSHIP_MODEL, temperature=0.0, max_tokens=512)
    llm_tools = llm.bind_tools([get_freedom_ratio])
    messages: list = [
        SystemMessage(
            content="You are a financial coach. Use tools when asked about user data. User id is 7."
        ),
        HumanMessage(content="What is my Freedom Ratio right now?"),
    ]
    ai: AIMessage = llm_tools.invoke(messages)
    if not ai.tool_calls:
        record("bind_tools -> tool_calls", False, "model returned no tool_calls")
        return
    call = ai.tool_calls[0]
    record("bind_tools -> tool_calls", call["name"] == "get_freedom_ratio", str(call["args"]))

    # Round trip: feed the tool result back, expect a grounded final answer.
    messages += [ai, ToolMessage(content=get_freedom_ratio.invoke(call["args"]), tool_call_id=call["id"])]
    final = llm_tools.invoke(messages)
    ok = "0.42" in str(final.content) or "42" in str(final.content)
    record("ToolMessage round trip", ok, str(final.content)[:80])


def check_thinking() -> None:
    # NOTE: langchain-openai 1.1.x drops DashScope's reasoning_content, so the
    # deal-analysis feature (and this check) stream the thinking model over the
    # raw HTTP API via core.qwen_stream.stream_thinking.
    print(f"\n4) Thinking model, streaming reasoning ({THINKING_MODEL})")
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        django.setup()
    except Exception:  # noqa: BLE001 - already set up
        pass
    from core.qwen_stream import stream_thinking

    reasoning, answer = "", ""
    t0 = time.time()
    messages = [
        {
            "role": "user",
            "content": (
                "A rental property costs 50M NGN, rents for 400k NGN/month, expenses "
                "150k/month. Is the cash-on-cash return attractive? Answer in 2 sentences."
            ),
        }
    ]
    for channel, text in stream_thinking(messages, model=THINKING_MODEL, max_tokens=1024):
        if channel == "reasoning":
            reasoning += text
        else:
            answer += text
    record(
        "reasoning_content deltas",
        bool(reasoning),
        f"{len(reasoning)} reasoning chars, {len(answer)} answer chars, {time.time() - t0:.1f}s",
    )


def check_embeddings() -> None:
    print(f"\n5) Embeddings ({EMBED_MODEL} @ 1024 dims)")
    emb = OpenAIEmbeddings(
        model=EMBED_MODEL,
        api_key=API_KEY,
        base_url=BASE_URL,
        dimensions=1024,
        check_embedding_ctx_length=False,  # DashScope rejects tiktoken token arrays
        chunk_size=10,  # DashScope batch cap
    )
    # 12 docs > batch cap of 10 to prove chunking works.
    docs = [f"Financial concept number {i}: assets put money in your pocket." for i in range(12)]
    vectors = emb.embed_documents(docs)
    q = emb.embed_query("what is an asset?")
    ok = len(vectors) == 12 and len(vectors[0]) == 1024 and len(q) == 1024
    record("embed_documents + embed_query", ok, f"{len(vectors)} docs x {len(vectors[0])} dims")


def main() -> int:
    if not API_KEY:
        print("DASHSCOPE_API_KEY is not set. Add it to backend/.env and re-run.")
        return 2
    print(f"Endpoint: {BASE_URL}")
    checks = [check_completion, check_streaming, check_tool_calling, check_thinking, check_embeddings]
    for fn in checks:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 - report and continue to next check
            record(fn.__name__, False, f"{type(exc).__name__}: {exc}")

    print("\n--- Summary ---")
    failed = [r for r in results if r[1] == FAIL]
    for name, status, detail in results:
        print(f"  {status}  {name}")
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
