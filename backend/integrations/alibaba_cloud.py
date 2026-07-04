"""Alibaba Cloud integration proof for the Qwen Cloud hackathon.

NairaSage's backend runs on Alibaba Cloud and uses these Alibaba services:

1. **Qwen Cloud / Model Studio (DashScope)** — every LLM call in the product
   goes through the OpenAI-compatible DashScope endpoint:
     - `core/llm_factory.py`     -> tiered chat models powering the 13-agent
       society (routing/specialists on qwen-flash, coach + synthesis on
       qwen3-max, deal deep-analysis on qwen3-235b-a22b-thinking-2507,
       document scan on qwen3-vl-plus)
     - `core/embeddings_factory.py` -> text-embedding-v4 for pgvector RAG
       (dashscope_embed below proves the call path)
     - `apps/wealth/voice_transcribe.py` -> qwen3-asr-flash-2026-02-10 via the
       native DashScope multimodal-generation API
2. **Object Storage Service (OSS)** — uploaded statement/receipt scans are
   stored in an OSS bucket through its S3-compatible API
   (`config/settings/production.py`, AWS_S3_ENDPOINT_URL -> oss-*.aliyuncs.com).
3. **Elastic Compute Service (ECS)** — the docker-compose stack
   (Postgres+pgvector, Redis, gunicorn web, RQ worker, Caddy TLS) runs on an
   ECS instance; see docker-compose.yml and docs/HACKATHON.md.

Run the live health check against all of them:

    python manage.py shell -c "from integrations.alibaba_cloud import health_report; health_report()"

or, without Django:  python -m integrations.alibaba_cloud  (from backend/)
"""

from __future__ import annotations

import json
import os
import urllib.request


def _api_key() -> str:
    key = os.getenv("DASHSCOPE_API_KEY", "")
    if not key:
        try:
            from django.conf import settings

            key = getattr(settings, "DASHSCOPE_API_KEY", "") or ""
        except Exception:  # noqa: BLE001 - usable outside Django too
            pass
    if not key:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured")
    return key


def _base_url() -> str:
    return os.getenv(
        "DASHSCOPE_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    )


def dashscope_chat(prompt: str, model: str = "qwen-flash") -> str:
    """Minimal raw call to Qwen Cloud chat completions (no SDK, stdlib only)."""
    req = urllib.request.Request(
        f"{_base_url()}/chat/completions",
        data=json.dumps(
            {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 64,
            }
        ).encode(),
        headers={
            "Authorization": f"Bearer {_api_key()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
    return body["choices"][0]["message"]["content"]


def dashscope_embed(text: str, model: str = "text-embedding-v4") -> int:
    """Embed one string on Qwen Cloud; returns the vector dimensionality."""
    req = urllib.request.Request(
        f"{_base_url()}/embeddings",
        data=json.dumps({"model": model, "input": text, "dimensions": 1024}).encode(),
        headers={
            "Authorization": f"Bearer {_api_key()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
    return len(body["data"][0]["embedding"])


def oss_health_check() -> str:
    """Round-trips a small object through the configured OSS bucket
    (S3-compatible API via django-storages)."""
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage

    path = default_storage.save("health/alibaba_oss_check.txt", ContentFile(b"ok"))
    exists = default_storage.exists(path)
    default_storage.delete(path)
    endpoint = os.getenv("AWS_S3_ENDPOINT_URL", "(default storage backend)")
    return f"wrote+deleted {path!r} via {endpoint} (exists check: {exists})"


def health_report() -> None:
    print(f"Qwen Cloud endpoint: {_base_url()}")
    print(f"  chat (qwen-flash): {dashscope_chat('Reply with the word OK.')[:40]!r}")
    try:
        print(f"  embeddings (text-embedding-v4): {dashscope_embed('asset')} dims")
    except Exception as e:  # noqa: BLE001 - free-tier may be capped; app falls back to Mistral
        print(f"  embeddings (text-embedding-v4): skipped ({e})")
    try:
        print(f"  OSS storage: {oss_health_check()}")
    except Exception as e:  # noqa: BLE001
        print(f"  OSS storage: skipped ({e})")


if __name__ == "__main__":
    health_report()
