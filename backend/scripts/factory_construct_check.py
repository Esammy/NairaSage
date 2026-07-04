"""Offline construction check: LLM_PROVIDER=qwen builds every tier correctly.

No network calls — just verifies factory wiring, model IDs, and base URLs.
Run: venv\\Scripts\\python.exe scripts\\factory_construct_check.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
os.environ["LLM_PROVIDER"] = "qwen"
os.environ["DASHSCOPE_API_KEY"] = "sk-dummy-construct-check"

import django  # noqa: E402

django.setup()

from core.embeddings_factory import get_embedding_model, get_embeddings_provider  # noqa: E402
from core.llm_factory import (  # noqa: E402
    get_coach_llm,
    get_llm,
    get_routing_llm,
    get_synthesis_llm,
    get_thinking_llm,
    get_vision_llm,
)

EXPECTED_BASE = "dashscope-intl.aliyuncs.com"
checks = {
    "get_llm (specialists)": (get_llm, "qwen3.5-flash"),
    "get_routing_llm": (get_routing_llm, "qwen3.5-flash"),
    "get_synthesis_llm": (get_synthesis_llm, "qwen3-max"),
    "get_coach_llm": (get_coach_llm, "qwen3-max"),
    "get_vision_llm": (get_vision_llm, "qwen3-vl-plus"),
    "get_thinking_llm": (get_thinking_llm, "qwen3-max-thinking"),
}

failed = False
for name, (fn, expected_model) in checks.items():
    llm = fn()
    model = getattr(llm, "model_name", getattr(llm, "model", "?"))
    base = str(getattr(llm, "openai_api_base", "")) or "?"
    ok = model == expected_model and EXPECTED_BASE in base
    failed |= not ok
    print(f"  [{'OK' if ok else 'FAIL'}] {name}: model={model} base={base}")

emb = get_embedding_model()
emb_ok = (
    get_embeddings_provider() == "qwen"
    and emb.model == "text-embedding-v4"
    and emb.dimensions == 1024
    and emb.check_embedding_ctx_length is False
    and emb.chunk_size == 10
)
failed |= not emb_ok
print(
    f"  [{'OK' if emb_ok else 'FAIL'}] embeddings: model={emb.model} dims={emb.dimensions} "
    f"ctx_check={emb.check_embedding_ctx_length} chunk={emb.chunk_size}"
)

print("\nAll constructions OK" if not failed else "\nFAILURES present")
sys.exit(1 if failed else 0)
